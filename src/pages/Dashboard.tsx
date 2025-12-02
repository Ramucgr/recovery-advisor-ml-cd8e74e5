import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Users, Heart, TrendingUp, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalAthletes: 0,
    activeInjuries: 0,
    activeRehab: 0,
    highRiskCount: 0,
  });

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      // Get total athletes
      const { count: athletesCount } = await supabase
        .from("athletes")
        .select("*", { count: "exact", head: true });

      // Get active injuries
      const { count: injuriesCount } = await supabase
        .from("injuries")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Get active rehab plans
      const { count: rehabCount } = await supabase
        .from("rehab_plans")
        .select("*", { count: "exact", head: true })
        .eq("status", "in_progress");

      // Get high risk predictions
      const { count: highRiskCount } = await supabase
        .from("predictions")
        .select("*", { count: "exact", head: true })
        .eq("risk_level", "high");

      setStats({
        totalAthletes: athletesCount || 0,
        activeInjuries: injuriesCount || 0,
        activeRehab: rehabCount || 0,
        highRiskCount: highRiskCount || 0,
      });
    } catch (error) {
      console.error("Error loading dashboard stats:", error);
    }
  };

  const statsCards = [
    {
      title: "Total Athletes",
      value: stats.totalAthletes,
      icon: Users,
      description: "Registered athletes",
      color: "text-primary",
    },
    {
      title: "Active Injuries",
      value: stats.activeInjuries,
      icon: Heart,
      description: "Currently being treated",
      color: "text-warning",
    },
    {
      title: "Active Rehabilitation",
      value: stats.activeRehab,
      icon: Activity,
      description: "Ongoing rehab programs",
      color: "text-secondary",
    },
    {
      title: "High Risk Alerts",
      value: stats.highRiskCount,
      icon: AlertTriangle,
      description: "Athletes at high risk",
      color: "text-danger",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of athlete health and injury management system
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={cn("h-4 w-4", stat.color)} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates from the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Welcome to the system</p>
                  <p className="text-xs text-muted-foreground">
                    Start by adding athlete profiles
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant="outline" className="w-full justify-start py-2 px-3 cursor-pointer hover:bg-accent">
                <Users className="mr-2 h-4 w-4" />
                Add New Athlete
              </Badge>
              <Badge variant="outline" className="w-full justify-start py-2 px-3 cursor-pointer hover:bg-accent">
                <Heart className="mr-2 h-4 w-4" />
                Record Injury
              </Badge>
              <Badge variant="outline" className="w-full justify-start py-2 px-3 cursor-pointer hover:bg-accent">
                <TrendingUp className="mr-2 h-4 w-4" />
                Generate Prediction
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}
