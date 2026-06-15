import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function ChamberSafetyFooter() {
  const { data: resources = [] } = useQuery({
    queryKey: ["mh-resources", "IN"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("mental_health_resources")
        .select("*")
        .eq("country_code", "IN")
        .eq("is_active", true)
        .limit(3);
      return data ?? [];
    },
  });
 
  const primary = resources[0];

  return (
    <footer className="border-t border-border/50 px-6 py-3 text-center">
      <p className="text-[11px] text-muted-foreground">
        This space is yours. No one reads it.
        {primary && (
          <>
            {" "}If you ever need a human:{" "}
            <a href={`tel:${primary.contact_info.replace(/\D/g, "").slice(0, 10)}`} className="text-accent-teal hover:underline">
              {primary.organisation} — {primary.contact_info.split("—")[0]?.trim()}
            </a>
          </>
        )}
        {" · "}
        <Link to="/community" className="text-primary hover:underline">Peer Support Circle</Link>
        {" · "}
        <Link to="/wellbeing" className="text-primary hover:underline">Wellbeing Pulse</Link>
      </p>
      <p className="mt-1 flex items-center justify-center gap-1 text-[10px] text-muted-foreground/70">
        <Heart className="h-3 w-3" /> Static resource links — not surveillance
      </p>
    </footer>
  );
}
