Gem::Specification.new do |spec|
  spec.name          = "nexus-cortex-sdk"
  spec.version       = "0.1.0"
  spec.authors       = ["NEXUS Core"]
  spec.email         = ["support@nexus.io"]
  spec.summary       = "A lightweight Ruby client wrapper for the NEXUS sovereign education system."
  spec.description   = "Ruby client wrapper for interacting with the NEXUS Cortex databases, supporting schema checks and backoff retries."
  spec.homepage      = "https://github.com/truth-spark-path"
  spec.license       = "MIT"

  spec.files         = Dir["lib/**/*.rb", "README.md", "Gemfile"]
  spec.require_paths = ["lib"]

  spec.add_development_dependency "bundler", "~> 2.0"
  spec.add_development_dependency "rake", "~> 13.0"
end
