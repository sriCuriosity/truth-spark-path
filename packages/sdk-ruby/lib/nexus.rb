require 'net/http'
require 'uri'
require 'json'
require 'time'

module Nexus
  class ValidationError < StandardError; end

  class CortexClient
    def initialize(supabase_url, supabase_key)
      @supabase_url = supabase_url.chomp('/')
      @supabase_key = supabase_key
    end

    def validate_entry!(data)
      required = [:entry_type, :title, :body, :domains]
      required.each do |field|
        unless data.key?(field) || data.key?(field.to_s)
          raise ValidationError, "Missing required field: '#{field}'"
        end
      end

      # Handle string/symbol keys
      entry_type = data[:entry_type] || data['entry_type']
      valid_types = ['action', 'perspective_shift', 'experiment', 'contribution']
      unless valid_types.include?(entry_type)
        raise ValidationError, "Invalid entry_type '#{entry_type}'. Must be one of #{valid_types}"
      end

      title = data[:title] || data['title']
      unless title.is_a?(String) && title.length >= 3 && title.length <= 100
        raise ValidationError, "Title must be a string between 3 and 100 characters"
      end

      body = data[:body] || data['body']
      unless body.is_a?(String) && body.length >= 10
        raise ValidationError, "Body must be a string with at least 10 characters"
      end

      domains = data[:domains] || data['domains']
      unless domains.is_a?(Array) && domains.length >= 1
        raise ValidationError, "Domains must be a list containing at least one tag"
      end
      domains.each do |domain|
        unless domain.is_a?(String)
          raise ValidationError, "Domain tags must be strings"
        end
      end

      happened_at = data[:happened_at] || data['happened_at']
      if happened_at
        begin
          Time.iso8601(happened_at)
        rescue ArgumentError
          raise ValidationError, "happened_at must be in valid ISO 8601 datetime format"
        end
      end
    end

    def create_entry(data)
      validate_entry!(data)
      uri = URI.parse("#{@supabase_url}/rest/v1/cortex_entries")
      
      response = execute_with_retry(uri, :post, data)
      parsed = JSON.parse(response.body)
      parsed.is_a?(Array) ? parsed.first : parsed
    end

    def get_entries(user_id)
      uri = URI.parse("#{@supabase_url}/rest/v1/cortex_entries?user_id=eq.#{user_id}&order=created_at.desc")
      response = execute_with_retry(uri, :get)
      JSON.parse(response.body)
    end

    def update_entry(entry_id, data)
      # Basic partial validation checks
      entry_type = data[:entry_type] || data['entry_type']
      if entry_type
        valid_types = ['action', 'perspective_shift', 'experiment', 'contribution']
        unless valid_types.include?(entry_type)
          raise ValidationError, "Invalid entry_type '#{entry_type}'. Must be one of #{valid_types}"
        end
      end

      title = data[:title] || data['title']
      if title && !(title.is_a?(String) && title.length >= 3 && title.length <= 100)
        raise ValidationError, "Title must be a string between 3 and 100 characters"
      end

      body = data[:body] || data['body']
      if body && !(body.is_a?(String) && body.length >= 10)
        raise ValidationError, "Body must be a string with at least 10 characters"
      end

      uri = URI.parse("#{@supabase_url}/rest/v1/cortex_entries?id=eq.#{entry_id}")
      response = execute_with_retry(uri, :patch, data)
      parsed = JSON.parse(response.body)
      parsed.is_a?(Array) ? parsed.first : parsed
    end

    def delete_entry(entry_id)
      uri = URI.parse("#{@supabase_url}/rest/v1/cortex_entries?id=eq.#{entry_id}")
      execute_with_retry(uri, :delete)
      nil
    end

    private

    def headers
      {
        'apikey' => @supabase_key,
        'Authorization' => "Bearer #{@supabase_key}",
        'Content-Type' => 'application/json',
        'Prefer' => 'return=representation'
      }
    end

    def execute_with_retry(uri, method, payload = nil, retries = 3, delay = 0.5)
      (0..retries).each do |attempt|
        begin
          http = Net::HTTP.new(uri.host, uri.port)
          if uri.scheme == 'https'
            http.use_ssl = true
          end

          request = case method
                    when :post
                      req = Net::HTTP::Post.new(uri.request_uri, headers)
                      req.body = payload.to_json if payload
                      req
                    when :get
                      Net::HTTP::Get.new(uri.request_uri, headers)
                    when :patch
                      req = Net::HTTP::Patch.new(uri.request_uri, headers)
                      req.body = payload.to_json if payload
                      req
                    when :delete
                      Net::HTTP::Delete.new(uri.request_uri, headers)
                    end

          response = http.request(request)

          # Retry on HTTP rate limits (429) or 5xx server issues
          status = response.code.to_i
          if [429, 500, 502, 503, 504].include?(status)
            raise "HTTP Error #{status} received"
          end

          return response
        rescue => e
          if attempt == retries
            raise e
          end
          sleep(delay)
          delay *= 2
        end
      end
    end
  end
end
