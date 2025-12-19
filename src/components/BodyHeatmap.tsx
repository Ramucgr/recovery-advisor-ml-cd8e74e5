import { useMemo } from "react";

interface BodyHeatmapProps {
  injuries: Array<{
    body_location: string;
  }>;
}

const bodyParts = [
  { id: "head", label: "Head", x: 100, y: 30, width: 40, height: 40 },
  { id: "neck", label: "Neck", x: 105, y: 70, width: 30, height: 20 },
  { id: "left_shoulder", label: "Left Shoulder", x: 60, y: 90, width: 35, height: 25 },
  { id: "right_shoulder", label: "Right Shoulder", x: 145, y: 90, width: 35, height: 25 },
  { id: "chest", label: "Chest", x: 85, y: 95, width: 70, height: 40 },
  { id: "left_arm", label: "Left Arm", x: 35, y: 115, width: 25, height: 60 },
  { id: "right_arm", label: "Right Arm", x: 180, y: 115, width: 25, height: 60 },
  { id: "left_elbow", label: "Left Elbow", x: 30, y: 145, width: 25, height: 25 },
  { id: "right_elbow", label: "Right Elbow", x: 185, y: 145, width: 25, height: 25 },
  { id: "left_forearm", label: "Left Forearm", x: 20, y: 170, width: 25, height: 50 },
  { id: "right_forearm", label: "Right Forearm", x: 195, y: 170, width: 25, height: 50 },
  { id: "left_wrist", label: "Left Wrist", x: 10, y: 220, width: 25, height: 20 },
  { id: "right_wrist", label: "Right Wrist", x: 205, y: 220, width: 25, height: 20 },
  { id: "left_hand", label: "Left Hand", x: 5, y: 240, width: 30, height: 35 },
  { id: "right_hand", label: "Right Hand", x: 205, y: 240, width: 30, height: 35 },
  { id: "abdomen", label: "Abdomen", x: 85, y: 135, width: 70, height: 40 },
  { id: "lower_back", label: "Lower Back", x: 85, y: 175, width: 70, height: 30 },
  { id: "hip", label: "Hip", x: 75, y: 205, width: 90, height: 30 },
  { id: "left_thigh", label: "Left Thigh", x: 70, y: 235, width: 40, height: 60 },
  { id: "right_thigh", label: "Right Thigh", x: 130, y: 235, width: 40, height: 60 },
  { id: "left_knee", label: "Left Knee", x: 70, y: 295, width: 40, height: 30 },
  { id: "right_knee", label: "Right Knee", x: 130, y: 295, width: 40, height: 30 },
  { id: "left_shin", label: "Left Shin", x: 70, y: 325, width: 35, height: 50 },
  { id: "right_shin", label: "Right Shin", x: 135, y: 325, width: 35, height: 50 },
  { id: "left_ankle", label: "Left Ankle", x: 65, y: 375, width: 40, height: 25 },
  { id: "right_ankle", label: "Right Ankle", x: 135, y: 375, width: 40, height: 25 },
  { id: "left_foot", label: "Left Foot", x: 55, y: 400, width: 50, height: 25 },
  { id: "right_foot", label: "Right Foot", x: 135, y: 400, width: 50, height: 25 },
];

const normalizeLocation = (location: string): string[] => {
  const lower = location.toLowerCase().trim();
  const matches: string[] = [];
  
  // Map common injury location terms to body part IDs (including typos and no-space variants)
  const mappings: Record<string, string[]> = {
    // Head & Neck
    "head": ["head"],
    "skull": ["head"],
    "face": ["head"],
    "neck": ["neck"],
    "cervical": ["neck"],
    
    // Shoulders
    "shoulder": ["left_shoulder", "right_shoulder"],
    "leftshoulder": ["left_shoulder"],
    "left shoulder": ["left_shoulder"],
    "rightshoulder": ["right_shoulder"],
    "right shoulder": ["right_shoulder"],
    
    // Chest & Core
    "chest": ["chest"],
    "thorax": ["chest"],
    "rib": ["chest"],
    "abdomen": ["abdomen"],
    "stomach": ["abdomen"],
    "core": ["abdomen"],
    
    // Arms
    "arm": ["left_arm", "right_arm"],
    "leftarm": ["left_arm"],
    "left arm": ["left_arm"],
    "rightarm": ["right_arm"],
    "right arm": ["right_arm"],
    "upper arm": ["left_arm", "right_arm"],
    "upperarm": ["left_arm", "right_arm"],
    "bicep": ["left_arm", "right_arm"],
    
    // Elbows
    "elbow": ["left_elbow", "right_elbow"],
    "leftelbow": ["left_elbow"],
    "left elbow": ["left_elbow"],
    "rightelbow": ["right_elbow"],
    "right elbow": ["right_elbow"],
    
    // Forearms
    "forearm": ["left_forearm", "right_forearm"],
    "leftforearm": ["left_forearm"],
    "left forearm": ["left_forearm"],
    "rightforearm": ["right_forearm"],
    "right forearm": ["right_forearm"],
    
    // Wrists
    "wrist": ["left_wrist", "right_wrist"],
    "leftwrist": ["left_wrist"],
    "left wrist": ["left_wrist"],
    "rightwrist": ["right_wrist"],
    "right wrist": ["right_wrist"],
    
    // Hands
    "hand": ["left_hand", "right_hand"],
    "lefthand": ["left_hand"],
    "left hand": ["left_hand"],
    "righthand": ["right_hand"],
    "right hand": ["right_hand"],
    "finger": ["left_hand", "right_hand"],
    
    // Back & Hip
    "back": ["lower_back"],
    "lowerback": ["lower_back"],
    "lower back": ["lower_back"],
    "lumbar": ["lower_back"],
    "spine": ["lower_back", "neck"],
    "hip": ["hip"],
    "pelvis": ["hip"],
    "groin": ["hip"],
    
    // Thighs
    "thigh": ["left_thigh", "right_thigh"],
    "leftthigh": ["left_thigh"],
    "left thigh": ["left_thigh"],
    "rightthigh": ["right_thigh"],
    "right thigh": ["right_thigh"],
    "quadricep": ["left_thigh", "right_thigh"],
    "quad": ["left_thigh", "right_thigh"],
    "hamstring": ["left_thigh", "right_thigh"],
    
    // Knees
    "knee": ["left_knee", "right_knee"],
    "leftknee": ["left_knee"],
    "left knee": ["left_knee"],
    "rightknee": ["right_knee"],
    "right knee": ["right_knee"],
    
    // Shins & Calves
    "shin": ["left_shin", "right_shin"],
    "leftshin": ["left_shin"],
    "left shin": ["left_shin"],
    "rightshin": ["right_shin"],
    "right shin": ["right_shin"],
    "calf": ["left_shin", "right_shin"],
    "leftcalf": ["left_shin"],
    "rightcalf": ["right_shin"],
    
    // Legs (general)
    "leg": ["left_thigh", "right_thigh", "left_shin", "right_shin"],
    "leftleg": ["left_thigh", "left_shin"],
    "left leg": ["left_thigh", "left_shin"],
    "rightleg": ["right_thigh", "right_shin"],
    "right leg": ["right_thigh", "right_shin"],
    
    // Ankles (including typos)
    "ankle": ["left_ankle", "right_ankle"],
    "ancle": ["left_ankle", "right_ankle"],
    "leftankle": ["left_ankle"],
    "left ankle": ["left_ankle"],
    "leftancle": ["left_ankle"],
    "rightankle": ["right_ankle"],
    "right ankle": ["right_ankle"],
    "rightancle": ["right_ankle"],
    "achilles": ["left_ankle", "right_ankle"],
    
    // Feet
    "foot": ["left_foot", "right_foot"],
    "feet": ["left_foot", "right_foot"],
    "leftfoot": ["left_foot"],
    "left foot": ["left_foot"],
    "rightfoot": ["right_foot"],
    "right foot": ["right_foot"],
    "toe": ["left_foot", "right_foot"],
    
    // Body (general)
    "body": ["chest", "abdomen"],
  };

  // First try exact match
  if (mappings[lower]) {
    return mappings[lower];
  }

  // Then try includes match for partial terms
  for (const [key, value] of Object.entries(mappings)) {
    if (lower.includes(key) || key.includes(lower)) {
      matches.push(...value);
    }
  }

  return [...new Set(matches)];
};

export default function BodyHeatmap({ injuries }: BodyHeatmapProps) {
  const locationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    injuries.forEach((injury) => {
      const bodyPartIds = normalizeLocation(injury.body_location);
      bodyPartIds.forEach((id) => {
        counts[id] = (counts[id] || 0) + 1;
      });
    });
    
    return counts;
  }, [injuries]);

  const maxCount = useMemo(() => {
    return Math.max(...Object.values(locationCounts), 1);
  }, [locationCounts]);

  const getHeatColor = (count: number): string => {
    if (count === 0) return "hsl(var(--muted))";
    const intensity = count / maxCount;
    if (intensity <= 0.25) return "hsl(var(--success))";
    if (intensity <= 0.5) return "hsl(var(--warning))";
    if (intensity <= 0.75) return "hsl(var(--danger))";
    return "hsl(var(--destructive))";
  };

  const getOpacity = (count: number): number => {
    if (count === 0) return 0.3;
    return 0.4 + (count / maxCount) * 0.6;
  };

  const topLocations = useMemo(() => {
    return Object.entries(locationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => {
        const part = bodyParts.find(p => p.id === id);
        return { label: part?.label || id, count };
      });
  }, [locationCounts]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-center">
      {/* Body SVG */}
      <div className="relative flex-shrink-0">
        <svg width="240" height="440" viewBox="0 0 240 440" className="mx-auto">
          {/* Body outline */}
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Body silhouette background */}
          <ellipse cx="120" cy="50" rx="28" ry="35" fill="hsl(var(--muted))" opacity="0.5" />
          <rect x="105" y="75" width="30" height="20" rx="5" fill="hsl(var(--muted))" opacity="0.5" />
          <ellipse cx="120" cy="130" rx="50" ry="45" fill="hsl(var(--muted))" opacity="0.5" />
          <ellipse cx="120" cy="190" rx="45" ry="35" fill="hsl(var(--muted))" opacity="0.5" />
          <ellipse cx="120" cy="225" rx="50" ry="25" fill="hsl(var(--muted))" opacity="0.5" />
          {/* Left leg */}
          <ellipse cx="90" cy="280" rx="22" ry="50" fill="hsl(var(--muted))" opacity="0.5" />
          <ellipse cx="85" cy="360" rx="18" ry="55" fill="hsl(var(--muted))" opacity="0.5" />
          <ellipse cx="80" cy="415" rx="25" ry="15" fill="hsl(var(--muted))" opacity="0.5" />
          {/* Right leg */}
          <ellipse cx="150" cy="280" rx="22" ry="50" fill="hsl(var(--muted))" opacity="0.5" />
          <ellipse cx="155" cy="360" rx="18" ry="55" fill="hsl(var(--muted))" opacity="0.5" />
          <ellipse cx="160" cy="415" rx="25" ry="15" fill="hsl(var(--muted))" opacity="0.5" />
          {/* Left arm */}
          <ellipse cx="55" cy="130" rx="15" ry="25" fill="hsl(var(--muted))" opacity="0.5" />
          <ellipse cx="40" cy="180" rx="12" ry="40" fill="hsl(var(--muted))" opacity="0.5" />
          <ellipse cx="25" cy="245" rx="18" ry="25" fill="hsl(var(--muted))" opacity="0.5" />
          {/* Right arm */}
          <ellipse cx="185" cy="130" rx="15" ry="25" fill="hsl(var(--muted))" opacity="0.5" />
          <ellipse cx="200" cy="180" rx="12" ry="40" fill="hsl(var(--muted))" opacity="0.5" />
          <ellipse cx="215" cy="245" rx="18" ry="25" fill="hsl(var(--muted))" opacity="0.5" />

          {/* Heatmap overlay regions */}
          {bodyParts.map((part) => {
            const count = locationCounts[part.id] || 0;
            return (
              <g key={part.id}>
                <rect
                  x={part.x}
                  y={part.y}
                  width={part.width}
                  height={part.height}
                  rx="8"
                  fill={getHeatColor(count)}
                  opacity={getOpacity(count)}
                  filter={count > 0 ? "url(#glow)" : undefined}
                  className="transition-all duration-300"
                />
                {count > 0 && (
                  <text
                    x={part.x + part.width / 2}
                    y={part.y + part.height / 2 + 4}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="bold"
                    fill="hsl(var(--foreground))"
                  >
                    {count}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend and Top Locations */}
      <div className="flex-1 space-y-4">
        {/* Color Legend */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Injury Frequency</h4>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-muted opacity-50" />
              <span className="text-muted-foreground">None</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-success" />
              <span className="text-muted-foreground">Low</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-warning" />
              <span className="text-muted-foreground">Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-danger" />
              <span className="text-muted-foreground">High</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-destructive" />
              <span className="text-muted-foreground">Critical</span>
            </div>
          </div>
        </div>

        {/* Top Injury Locations */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Most Affected Areas</h4>
          {topLocations.length > 0 ? (
            <div className="space-y-2">
              {topLocations.map((loc, index) => (
                <div key={loc.label} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-muted-foreground w-4">{index + 1}.</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-foreground">{loc.label}</span>
                      <span className="text-sm font-medium text-foreground">{loc.count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${(loc.count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No injury data available</p>
          )}
        </div>
      </div>
    </div>
  );
}