import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from "recharts";
import { FileText, Download, TrendingUp, Users, Heart, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Reports() {
  const [injuryByType, setInjuryByType] = useState<any[]>([]);
  const [injuryBySeverity, setInjuryBySeverity] = useState<any[]>([]);
  const [monthlyInjuries, setMonthlyInjuries] = useState<any[]>([]);
  const [riskDistribution, setRiskDistribution] = useState<any[]>([]);
  const [recoveryStats, setRecoveryStats] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalAthletes: 0,
    totalInjuries: 0,
    avgRecovery: 0,
    activeRehab: 0,
  });

  const COLORS = ["hsl(145, 65%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)", "hsl(210, 85%, 45%)", "hsl(180, 75%, 45%)"];

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    await Promise.all([
      loadInjuryStats(),
      loadPredictionStats(),
      loadOverallStats(),
    ]);
  };

  const loadInjuryStats = async () => {
    const { data: injuries } = await supabase.from("injuries").select("*");
    
    if (injuries) {
      // Group by type
      const typeGroups = injuries.reduce((acc: any, inj) => {
        acc[inj.injury_type] = (acc[inj.injury_type] || 0) + 1;
        return acc;
      }, {});
      setInjuryByType(Object.entries(typeGroups).map(([name, value]) => ({ name, value })));

      // Group by severity
      const severityGroups = injuries.reduce((acc: any, inj) => {
        acc[inj.severity] = (acc[inj.severity] || 0) + 1;
        return acc;
      }, {});
      setInjuryBySeverity(Object.entries(severityGroups).map(([name, value]) => ({ name, value })));

      // Monthly trend
      const monthlyGroups = injuries.reduce((acc: any, inj) => {
        const month = new Date(inj.injury_date).toLocaleDateString('en-US', { month: 'short' });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {});
      setMonthlyInjuries(Object.entries(monthlyGroups).map(([month, injuries]) => ({ month, injuries })));
    }
  };

  const loadPredictionStats = async () => {
    const { data: predictions } = await supabase.from("predictions").select("*");
    
    if (predictions) {
      // Risk distribution
      const riskGroups = predictions.reduce((acc: any, pred) => {
        acc[pred.risk_level] = (acc[pred.risk_level] || 0) + 1;
        return acc;
      }, {});
      setRiskDistribution(Object.entries(riskGroups).map(([name, value]) => ({ name, value })));

      // Recovery prediction trend
      const recoveryData = predictions.slice(0, 10).map((pred, i) => ({
        name: `P${i + 1}`,
        predicted: pred.predicted_recovery_days,
        confidence: Math.round((pred.confidence_score || 0) * 100),
      }));
      setRecoveryStats(recoveryData);
    }
  };

  const loadOverallStats = async () => {
    const { count: athleteCount } = await supabase.from("athletes").select("*", { count: "exact", head: true });
    const { count: injuryCount } = await supabase.from("injuries").select("*", { count: "exact", head: true });
    const { count: rehabCount } = await supabase.from("rehab_plans").select("*", { count: "exact", head: true }).eq("status", "in_progress");
    const { data: predictions } = await supabase.from("predictions").select("predicted_recovery_days");

    const avgRecovery = predictions?.length 
      ? Math.round(predictions.reduce((sum, p) => sum + (p.predicted_recovery_days || 0), 0) / predictions.length)
      : 0;

    setStats({
      totalAthletes: athleteCount || 0,
      totalInjuries: injuryCount || 0,
      avgRecovery,
      activeRehab: rehabCount || 0,
    });
  };

  const exportReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      statistics: stats,
      injuryByType,
      injuryBySeverity,
      riskDistribution,
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `injury-report-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Visualize injury data and predictions</p>
        </div>
        <Button onClick={exportReport} className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalAthletes}</p>
                <p className="text-sm text-muted-foreground">Total Athletes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10">
                <Heart className="h-6 w-6 text-danger" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalInjuries}</p>
                <p className="text-sm text-muted-foreground">Total Injuries</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
                <TrendingUp className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgRecovery}</p>
                <p className="text-sm text-muted-foreground">Avg Recovery (days)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
                <Activity className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeRehab}</p>
                <p className="text-sm text-muted-foreground">Active Rehab Plans</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Injuries by Type</CardTitle>
            <CardDescription>Distribution of injury types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={injuryByType}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="value" fill="hsl(210, 85%, 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Severity Distribution</CardTitle>
            <CardDescription>Breakdown by injury severity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={injuryBySeverity}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {injuryBySeverity.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Monthly Injury Trend</CardTitle>
            <CardDescription>Number of injuries over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyInjuries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Area type="monotone" dataKey="injuries" stroke="hsl(0, 72%, 51%)" fill="hsl(0, 72%, 51%, 0.2)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Risk Level Distribution</CardTitle>
            <CardDescription>ML prediction risk levels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {riskDistribution.map((entry, index) => {
                      const color = entry.name === "low" ? COLORS[0] : entry.name === "medium" ? COLORS[1] : COLORS[2];
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recovery Predictions Chart */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Recovery Predictions Overview</CardTitle>
          <CardDescription>Predicted recovery days vs model confidence</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={recoveryStats}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="predicted" stroke="hsl(210, 85%, 45%)" name="Recovery Days" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="confidence" stroke="hsl(145, 65%, 45%)" name="Confidence %" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
