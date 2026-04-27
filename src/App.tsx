import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  LayoutDashboard,
  FileText,
  Cpu,
  Grid3X3,
  Sparkles,
  Terminal,
  Zap,
  Activity,
  Target,
  Layers,
  Search,
  Rocket,
  ShieldCheck,
  ChevronRight,
  Power,
  Trash2,
  Download,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Flame
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  TooltipProvider,
} from "@/components/ui/tooltip"

// --- CONFIG ---
const OPENAI_API_KEY = 'PASTE_YOUR_KEY_HERE';

// --- TYPES ---

type AgentStatus = 'idle' | 'running' | 'done' | 'error';

interface AgentState {
  status: AgentStatus;
  data: any | null;
  stream: string;
  error?: string;
}

interface AgentDef {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  desc: string;
  systemPrompt: string;
}

// --- CONSTANTS ---

const AGENT_DEFS: AgentDef[] = [
  {
    id: "hook",
    name: "Hook Intelligence",
    icon: Zap,
    color: "text-cyan-400",
    desc: "Reverse-engineers first-3-second hook patterns",
    systemPrompt: "You are the Hook Intelligence Agent — a specialist in analyzing Instagram Reel opening hooks. Analyze the provided reel URLs/transcripts and extract: 1. TOP HOOK FORMULAS (list the repeating hook structures you see) 2. HOOK CATEGORIES (curiosity / pain / contrarian / authority / story) 3. HOOK SWIPE BANK (5-8 reusable hook templates) 4. HOOK OPPORTUNITIES (2-3 underused hook angles in this niche) Format your response as valid JSON: { \"hookFormulas\": [], \"hookCategories\": { \"curiosity\": 0, \"pain\": 0, \"contrarian\": 0, \"authority\": 0, \"story\": 0 }, \"hookSwipeBank\": [], \"hookOpportunities\": [], \"topInsight\": \"\" }"
  },
  {
    id: "retention",
    name: "Retention Analysis",
    icon: Activity,
    color: "text-emerald-400",
    desc: "Detects open loops and pacing structures",
    systemPrompt: "You are the Retention Agent — a specialist in why viewers keep watching short-form video. Analyze the provided reel content and identify: 1. OPEN LOOP TECHNIQUES used 2. PATTERN INTERRUPTS detected 3. STORY PACING structures 4. PAYOFF TIMING patterns 5. RETENTION FORMULAS that repeat. Format as JSON: { \"openLoopTechniques\": [], \"patternInterrupts\": [], \"storyPacing\": [], \"retentionFormulas\": [], \"avgRetentionScore\": 0, \"topInsight\": \"\" }"
  },
  {
    id: "gap",
    name: "Topic Gap Mapper",
    icon: Target,
    color: "text-amber-400",
    desc: "Finds underserved content whitespace",
    systemPrompt: "You are the Topic Gap Agent — a specialist in finding underserved content opportunities. Analyze the provided reel content and identify: 1. OVERSATURATED TOPICS (what everyone is covering) 2. CONTENT GAPS (what nobody is covering but audiences want) 3. BLUE OCEAN ANGLES (fresh takes on existing topics) 4. IGNORED PAIN POINTS (audience needs not being addressed). Format as JSON: { \"oversaturatedTopics\": [], \"contentGaps\": [], \"blueOceanAngles\": [], \"ignoredPainPoints\": [], \"gapOpportunityScore\": 0, \"topInsight\": \"\" }"
  },
  {
    id: "pattern",
    name: "Pattern Recognition",
    icon: Layers,
    color: "text-purple-400",
    desc: "Clusters viral story archetypes",
    systemPrompt: "You are the Pattern Recognition Agent — a specialist in detecting repeating viral content structures. Analyze the provided reel content and find: 1. FORMAT ARCHETYPES (story structures that repeat) 2. THEME CLUSTERS (topic groupings) 3. VIRALITY SIGNATURES (what highest-performing content has in common) 4. CONTENT FRAMEWORKS (repeating presentation methods). Format as JSON: { \"formatArchetypes\": [], \"themeClusters\": [], \"viralitySignatures\": [], \"contentFrameworks\": [], \"patternConfidence\": 0, \"topInsight\": \"\" }"
  },
  {
    id: "competitor",
    name: "Competitor Intel",
    icon: Search,
    color: "text-rose-400",
    desc: "Maps growth patterns and positioning",
    systemPrompt: "You are the Competitor Intelligence Agent — a specialist in competitive content analysis. Analyze the provided competitor reel content and identify: 1. POSITIONING DIFFERENCES between top and emerging creators 2. FORMAT ADVANTAGES certain creators have 3. GROWTH PATTERN SIGNALS (what's working for growing accounts) 4. COMPETITIVE GAPS (where established creators are weak). Format as JSON: { \"positioningDifferences\": [], \"formatAdvantages\": [], \"growthPatternSignals\": [], \"competitiveGaps\": [], \"competitiveScore\": 0, \"topInsight\": \"\" }"
  },
  {
    id: "strategy",
    name: "Content Strategy",
    icon: Rocket,
    color: "text-orange-400",
    desc: "Synthesizes research into concepts",
    systemPrompt: "You are the Content Strategy Agent — you synthesize all research into actionable reel concepts. Based on the research insights provided, generate exactly 5 high-priority reel concepts. Each concept must have a strong hook, clear angle, content bucket, and viral probability score. Format as JSON: { \"reelConcepts\": [ { \"id\": 1, \"hook\": \"\", \"angle\": \"\", \"bucket\": \"\", \"viralProbability\": 0, \"outline\": \"\", \"cta\": \"\" } ], \"contentPillars\": [], \"seriesConcepts\": [], \"topInsight\": \"\" }"
  }
];

// --- APP COMPONENT ---

export default function App() {
  const [reelInput, setReelInput] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [agentStates, setAgentStates] = useState<Record<string, AgentState>>(
    Object.fromEntries(AGENT_DEFS.map(a => [a.id, { status: 'idle', data: null, stream: '' }]))
  );
  
  // Stats
  const reelCount = useMemo(() => reelInput.split('\n').filter(l => l.trim()).length, [reelInput]);
  const doneCount = useMemo(() => Object.values(agentStates).filter(s => s.status === 'done').length, [agentStates]);
  
  // Sidebar items
  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'input', label: 'Reel Input', icon: FileText },
    { id: 'agents', label: 'Agent Center', icon: Cpu },
    { id: 'insights', label: 'Insights Board', icon: Grid3X3 },
    { id: 'recommendations', label: 'Strategy Lab', icon: Sparkles },
    { id: 'export', label: 'Archive', icon: Download },
  ];

  const handleResetSession = () => {
    if (confirm('Clear current research session?')) {
      setAgentStates(Object.fromEntries(AGENT_DEFS.map(a => [a.id, { status: 'idle', data: null, stream: '' }])));
      setActiveTab('dashboard');
    }
  };

  const runAgent = async (id: string) => {
    if (agentStates[id].status === 'running' || !OPENAI_API_KEY || OPENAI_API_KEY === 'PASTE_YOUR_KEY_HERE' || !reelInput) return;
    
    setAgentStates(prev => ({ ...prev, [id]: { ...prev[id], status: 'running', stream: '', error: undefined } }));
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          stream: true,
          temperature: 0.7,
          max_tokens: 1500,
          messages: [
            { role: 'system', content: AGENT_DEFS.find(a => a.id === id)?.systemPrompt },
            { role: 'user', content: `Analyze these reels and context:\n\n${reelInput}\n\nProvide specialist JSON analysis.` }
          ]
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'OpenAI API Error');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.slice(6));
                const content = data.choices[0].delta?.content || '';
                accumulated += content;
                setAgentStates(prev => ({ ...prev, [id]: { ...prev[id], stream: accumulated } }));
              } catch (e) {}
            }
          }
        }
      }

      const jsonMatch = accumulated.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setAgentStates(prev => ({ ...prev, [id]: { ...prev[id], status: 'done', data: parsed } }));
      } else {
        throw new Error("No JSON found");
      }

    } catch (e: any) {
      setAgentStates(prev => ({ ...prev, [id]: { ...prev[id], status: 'error', error: e.message } }));
    }
  };

  const runAll = () => {
    AGENT_DEFS.forEach((agent, i) => {
      setTimeout(() => runAgent(agent.id), i * 300);
    });
  };

  return (
    <TooltipProvider>
      <div className="dark flex h-screen bg-background text-foreground font-sans overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-64 border-r border-border bg-card/50 flex flex-col z-20">
          <div className="p-6 border-b border-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Terminal className="text-primary-foreground" size={18} />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tighter uppercase leading-tight">ReelOS <span className="text-[10px] opacity-40 font-medium">v2.0</span></h1>
              <Badge variant="outline" className="text-[8px] py-0 h-4 border-primary/20 text-primary">GPT-4o NODE</Badge>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
                  activeTab === item.id 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <item.icon size={16} />
                {item.label}
                {item.id === 'agents' && doneCount > 0 && (
                  <span className="ml-auto w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-[8px]">
                    {doneCount}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-border space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <span>Pipeline Depth</span>
                <span className="text-primary">{Math.round((doneCount / 6) * 100)}%</span>
              </div>
              <Progress value={(doneCount / 6) * 100} className="h-1" />
            </div>
            <div className="flex items-center gap-2 px-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-500 tracking-wide uppercase">Core Uplink Stable</span>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Background Mesh */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--primary-foreground)_0%,transparent_50%)] opacity-[0.03] pointer-events-none" />
          
          <header className="h-14 border-b border-border bg-background/50 backdrop-blur-md flex items-center justify-between px-8 z-10">
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              <span>Platform</span>
              <ChevronRight size={12} />
              <span className="text-foreground">{activeTab}</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[9px] font-bold py-0 h-5 px-2 bg-primary/10 text-primary border-none">
                  {reelCount} CONTEXT NODES
                </Badge>
                {doneCount > 0 && (
                  <Badge variant="secondary" className="text-[9px] font-bold py-0 h-5 px-2 bg-emerald-500/10 text-emerald-500 border-none">
                    {doneCount}/6 AGENTS READY
                  </Badge>
                )}
              </div>
              <Separator orientation="vertical" className="h-4" />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleResetSession}>
                <Power size={16} />
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-8 relative">
            <div className="max-w-6xl mx-auto h-full">
              {activeTab === 'dashboard' && <DashboardView setActiveTab={setActiveTab} reelCount={reelCount} doneCount={doneCount} agentStates={agentStates} />}
              {activeTab === 'input' && <InputView reelInput={reelInput} setReelInput={setReelInput} />}
              {activeTab === 'agents' && <AgentsView agentStates={agentStates} runAgent={runAgent} runAll={runAll} reelInput={reelInput} />}
              {activeTab === 'insights' && <InsightsView agentStates={agentStates} />}
              {activeTab === 'recommendations' && <RecommendationsView agentStates={agentStates} />}
              {activeTab === 'export' && <ExportView reelInput={reelInput} agentStates={agentStates} />}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

function DashboardView({ setActiveTab, reelCount, doneCount, agentStates }: any) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent p-12 rounded-3xl overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-all duration-1000 rotate-12">
          <Rocket size={200} />
        </div>
        <Badge className="mb-6 bg-primary/10 text-primary border-none font-black tracking-widest text-[10px]">OPERATIONAL STATUS: READY</Badge>
        <h1 className="text-5xl font-black mb-6 tracking-tighter leading-[0.9] text-foreground">
          DECODE VIRAL <br />
          <span className="text-primary">DNA INSTANTLY.</span>
        </h1>
        <p className="text-muted-foreground text-sm max-w-xl leading-relaxed mb-10 font-medium">
          Deploy 6 specialized GPT-4o agents to dissect competitor reel data, identify market gaps, and generate 30 high-probability content frameworks.
        </p>
        <div className="flex gap-4">
          <Button size="lg" className="font-bold uppercase tracking-widest h-12 px-8" onClick={() => setActiveTab('input')}>
            <FileText className="mr-2" size={18} /> Ingest Data
          </Button>
          <Button size="lg" variant="outline" className="font-bold uppercase tracking-widest h-12 px-8" onClick={() => setActiveTab('agents')}>
            <Cpu className="mr-2" size={18} /> Deploy Agents
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Context Nodes', value: reelCount, color: 'text-primary', icon: Layers },
          { label: 'Agents Online', value: `${doneCount}/06`, color: 'text-emerald-500', icon: ShieldCheck },
          { label: 'System Uptime', value: '100%', color: 'text-amber-500', icon: Flame },
        ].map((stat, i) => (
          <Card key={i} className="border-border bg-card/30 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">{stat.label}</span>
                <stat.icon className={stat.color} size={16} />
              </div>
              <div className={`text-4xl font-black ${stat.color} tracking-tighter`}>{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-border bg-card/30">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 size={16} className="text-primary" />
              Pipeline Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Ingest Reel URLs & Context', done: reelCount > 0 },
              { label: 'Execute Core Analysis Agents', done: doneCount >= 3 },
              { label: 'Synthesize Market Gaps', done: agentStates.gap.status === 'done' },
              { label: 'Generate Strategic Concepts', done: agentStates.strategy.status === 'done' },
            ].map((step, i) => (
              <div key={i} className={`flex items-center gap-4 p-3 rounded-lg border ${step.done ? 'bg-emerald-500/5 border-emerald-500/20 opacity-100' : 'bg-muted/50 border-border opacity-50'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${step.done ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                  {step.done ? '✓' : i + 1}
                </div>
                <span className={`text-xs font-bold ${step.done ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/30">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <Activity size={16} className="text-primary" />
              Agent Live Stream
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {AGENT_DEFS.map(agent => {
                const state = agentStates[agent.id];
                return (
                  <div key={agent.id} className="flex items-center justify-between p-2 rounded border border-border bg-background/50">
                    <div className="flex items-center gap-3">
                      <agent.icon className={agent.color} size={14} />
                      <span className="text-[11px] font-bold tracking-tight">{agent.name}</span>
                    </div>
                    <Badge variant={state.status === 'done' ? 'default' : state.status === 'running' ? 'secondary' : 'outline'} className={`text-[8px] px-1.5 h-4 border-none ${state.status === 'done' ? 'bg-emerald-500 text-white' : state.status === 'running' ? 'bg-amber-500 text-white animate-pulse' : ''}`}>
                      {state.status.toUpperCase()}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InputView({ reelInput, setReelInput }: any) {
  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500 h-[calc(100vh-12rem)] flex flex-col">
      <div className="mb-6">
        <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">Source Ingestion</h2>
        <p className="text-muted-foreground text-sm">Paste all competitor data, transcripts, and URLs here. Each line increases agent precision.</p>
      </div>
      
      <Card className="flex-1 flex flex-col border-border bg-card/30 relative overflow-hidden">
        <Textarea 
          className="flex-1 p-8 bg-transparent border-none focus-visible:ring-0 text-sm font-mono leading-relaxed resize-none placeholder:text-muted-foreground/30"
          placeholder="https://instagram.com/reels/...\n\nNiche: Fitness Coaching\nCompetitors: @johnfitness (1.2M), @sarahlifts (800k)\n\nTranscripts:\n[Reel 1]: 'Stop eating chicken breast every single day...'"
          value={reelInput}
          onChange={(e) => setReelInput(e.target.value)}
        />
        <div className="p-4 border-t border-border bg-muted/30 flex justify-between items-center">
          <div className="flex gap-2">
            <Badge variant="outline" className="border-border text-muted-foreground font-bold tracking-widest">{reelInput.split('\n').filter(l => l.trim()).length} DATA POINTS</Badge>
            <Badge variant="outline" className="border-border text-muted-foreground font-bold tracking-widest">{reelInput.length} CHARS</Badge>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" size="sm" className="text-destructive font-bold uppercase tracking-widest hover:bg-destructive/10" onClick={() => setReelInput('')}>
              <Trash2 size={14} className="mr-2" /> Reset
            </Button>
            <Button size="sm" className="font-bold uppercase tracking-widest px-6 shadow-lg shadow-primary/20">
              <CheckCircle2 size={14} className="mr-2" /> Commit
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function AgentsView({ agentStates, runAgent, runAll, reelInput }: any) {
  return (
    <div className="space-y-8 animate-in zoom-in-95 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">Agent Command Center</h2>
          <p className="text-muted-foreground text-sm font-medium">Trigger parallel execution for autonomous research synthesis.</p>
        </div>
        <Button onClick={runAll} disabled={!reelInput} size="lg" className="font-black uppercase tracking-[0.1em] shadow-xl shadow-primary/20">
          <Zap className="mr-2 fill-current" size={18} /> Execute Parallel Pipeline
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {AGENT_DEFS.map(agent => {
          const state = agentStates[agent.id];
          return (
            <Card key={agent.id} className={`border-border bg-card/30 transition-all duration-500 relative overflow-hidden ${state.status === 'running' ? 'border-primary shadow-2xl shadow-primary/10 bg-primary/5' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className={`p-3 rounded-xl bg-background border border-border shadow-inner ${agent.color}`}>
                    <agent.icon size={20} />
                  </div>
                  <Badge variant={state.status === 'done' ? 'default' : 'outline'} className={`text-[8px] font-black h-5 ${state.status === 'done' ? 'bg-emerald-500 text-white' : ''}`}>
                    {state.status.toUpperCase()}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-black tracking-tight mt-4 uppercase tracking-wider">{agent.name}</CardTitle>
                <CardDescription className="text-[10px] leading-relaxed line-clamp-2 h-8">{agent.desc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-32 bg-background/80 rounded-lg border border-border p-3 font-mono text-[9px] overflow-hidden flex flex-col relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-primary/20 animate-pulse" />
                  <ScrollArea className="flex-1">
                    <div className="text-primary font-bold opacity-60 mb-1">{`> SESSION_INIT: ${agent.id.toUpperCase()}`}</div>
                    <div className="text-muted-foreground/80 leading-normal">
                      {state.stream || (state.status === 'idle' ? 'Ready for deployment. Waiting for context ingestion...' : '')}
                      {state.status === 'running' && <span className="inline-block w-1 h-3 bg-primary ml-1 animate-pulse" />}
                    </div>
                  </ScrollArea>
                  {state.status === 'running' && <div className="mt-2 text-primary font-bold uppercase tracking-widest text-[8px] animate-pulse">Receiving Uplink...</div>}
                </div>
                
                <Button 
                  variant={state.status === 'done' ? 'outline' : 'default'} 
                  className={`w-full font-bold uppercase tracking-widest h-10 ${state.status === 'running' ? 'animate-pulse' : ''}`}
                  disabled={!reelInput || state.status === 'running'}
                  onClick={() => runAgent(agent.id)}
                >
                  {state.status === 'done' ? 'Regenerate Analysis' : state.status === 'running' ? 'Processing...' : 'Activate Agent'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function InsightsView({ agentStates }: any) {
  const doneAgents = AGENT_DEFS.filter(a => agentStates[a.id].status === 'done');

  if (doneAgents.length === 0) {
    return (
      <div className="h-[60vh] flex items-center justify-center text-center">
        <div className="space-y-4">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6 border border-border">
            <Search size={32} className="text-muted-foreground opacity-20" />
          </div>
          <h2 className="text-2xl font-black text-muted-foreground uppercase tracking-widest">No Intelligence Captured</h2>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">Execute research agents in the Command Center to populate this visual intelligence board.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">Aggregated Intelligence</h2>
          <p className="text-muted-foreground text-sm font-medium">Merged cross-agent findings for final research synthesis.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {doneAgents.map(agent => {
          const data = agentStates[agent.id].data;
          return (
            <Card key={agent.id} className="border-border bg-card/30 backdrop-blur-xl overflow-hidden group">
              <div className={`h-1.5 w-full bg-current ${agent.color.replace('text-', 'bg-')}`} />
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <agent.icon className={agent.color} size={18} />
                    <CardTitle className="text-xs font-black uppercase tracking-[0.1em]">{agent.name}</CardTitle>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-none text-[8px] font-black">AI VERIFIED</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-xl bg-background/50 border border-border font-medium italic text-xs leading-relaxed border-l-4 border-l-primary group-hover:bg-background transition-colors duration-500">
                  "{data.topInsight || "Analysis successfully synthesized into core strategic finding."}"
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {Object.entries(data).filter(([k]) => k !== 'topInsight' && !k.toLowerCase().includes('score') && !k.toLowerCase().includes('confidence')).map(([key, val]: any) => (
                    <div key={key} className="space-y-3">
                      <Label className={`text-[9px] font-black uppercase tracking-widest ${agent.color}`}>{key.replace(/([A-Z])/g, ' $1')}</Label>
                      <div className="space-y-2">
                        {Array.isArray(val) ? (
                          val.slice(0, 3).map((item, i) => (
                            <div key={i} className="flex gap-2 text-[10px] text-muted-foreground leading-snug">
                              <span className={agent.color}>•</span> {String(item)}
                            </div>
                          ))
                        ) : (
                          <div className="text-[10px] text-foreground font-bold">{String(val)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {Object.entries(data).filter(([k]) => k.toLowerCase().includes('score') || k.toLowerCase().includes('confidence')).map(([key, val]: any) => (
                    <div key={key} className="col-span-full pt-2">
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest opacity-60">{key}</Label>
                        <span className={`text-xs font-black ${agent.color}`}>{val}%</span>
                      </div>
                      <Progress value={val} className="h-1" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function RecommendationsView({ agentStates }: any) {
  const stratData = agentStates.strategy?.data;

  if (!stratData) {
    return (
      <div className="h-[60vh] flex items-center justify-center text-center">
        <div className="space-y-4">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6 border border-border">
            <Sparkles size={32} className="text-muted-foreground opacity-20" />
          </div>
          <h2 className="text-2xl font-black text-muted-foreground uppercase tracking-widest">Strategy Engine Offline</h2>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">Trigger the Content Strategy Agent to generate optimized creative concepts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black tracking-tight mb-2 uppercase italic leading-none">30 High-Value <br /><span className="text-primary">Content Blueprints</span></h2>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black px-4 py-1.5 h-auto text-[10px] tracking-widest">
            {stratData.reelConcepts?.length || 0} OPTIMIZED CONCEPTS READY
          </Badge>
          <Button variant="outline" size="sm" className="font-bold uppercase tracking-widest border-border">↗ Archive Lab</Button>
        </div>
      </div>

      {stratData.contentPillars && (
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {stratData.contentPillars.map((p: string, i: number) => (
            <div key={i} className="px-5 py-2.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-[10px] font-black tracking-widest uppercase whitespace-nowrap">
              # {p}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-6">
        {stratData.reelConcepts?.map((reel: any, i: number) => (
          <Card key={i} className="border-border bg-card/40 transition-all duration-300 hover:border-primary/40 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/10 to-transparent pointer-events-none" />
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row gap-10 items-start">
                <div className="flex-1 space-y-6">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-3xl font-black text-muted-foreground/20 italic mr-2 leading-none">{(i + 1).toString().padStart(2, '0')}</span>
                    <Badge variant="outline" className="text-[9px] font-bold tracking-widest border-primary/30 text-primary uppercase">{reel.angle}</Badge>
                    <Badge variant="outline" className="text-[9px] font-bold tracking-widest border-border text-muted-foreground uppercase">{reel.bucket}</Badge>
                    {reel.cta && <Badge variant="outline" className="text-[9px] font-bold tracking-widest border-amber-500/30 text-amber-500 uppercase">CTA: {reel.cta}</Badge>}
                  </div>
                  <h3 className="text-2xl font-black text-foreground tracking-tight leading-snug group-hover:text-primary transition-colors duration-300">"{reel.hook}"</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium">{reel.outline}</p>
                </div>
                <div className="w-full lg:w-48 space-y-6 border-l border-border pl-10">
                  <div>
                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-2">Viral Probability</Label>
                    <div className="text-5xl font-black text-emerald-500 tracking-tighter leading-none">{reel.viralProbability}%</div>
                    <Progress value={reel.viralProbability} className="h-1.5 mt-3" />
                  </div>
                  <Button className="w-full font-black uppercase tracking-widest text-[10px] h-10 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20" variant="secondary">
                    + Save to Drafts
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {stratData.seriesConcepts && (
        <Card className="border-primary/20 bg-primary/5 overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-3">
              <Layers size={14} /> Long-form Recursive Series Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {stratData.seriesConcepts.map((s: string, i: number) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-background border border-primary/10">
                  <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-primary text-[10px] font-black">{i + 1}</div>
                  <p className="text-xs font-bold leading-relaxed">{s}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ExportView({ reelInput, agentStates }: any) {
  const doneCount = Object.values(agentStates).filter((s: any) => s.status === 'done').length;

  const download = (filename: string, content: string, type = 'text/plain') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportFullJSON = () => {
    const data = {
      generatedAt: new Date().toISOString(),
      reelInput,
      agentOutputs: Object.fromEntries(
        Object.entries(agentStates).map(([id, s]: any) => [id, s.data])
      )
    };
    download('ReelOS-Full-Research.json', JSON.stringify(data, null, 2), 'application/json');
  };

  const exports = [
    { title: 'Full Research JSON', desc: 'All agent outputs + input context', icon: Search, action: exportFullJSON, color: 'text-cyan-400' },
    { 
      title: 'Hook Swipe Bank', desc: 'All hook templates extracted', icon: Zap, color: 'text-amber-500', 
      action: () => download('ReelOS-Hooks.txt', agentStates.hook?.data?.hookSwipeBank?.join('\n\n') || ''),
      disabled: !agentStates.hook?.data 
    },
    { 
      title: 'Content Strategy', desc: '30 Reel ideas in JSON format', icon: Sparkles, color: 'text-emerald-500', 
      action: () => download('ReelOS-Strategy.json', JSON.stringify(agentStates.strategy?.data, null, 2), 'application/json'),
      disabled: !agentStates.strategy?.data 
    },
    { 
      title: 'Gap Analysis', desc: 'Market whitespace findings', icon: Target, color: 'text-purple-500', 
      action: () => download('ReelOS-Gaps.json', JSON.stringify(agentStates.gap?.data, null, 2), 'application/json'),
      disabled: !agentStates.gap?.data 
    },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="mb-10">
        <h2 className="text-4xl font-black tracking-tight mb-2 uppercase italic leading-none">Archive & <br /><span className="text-primary">System Export</span></h2>
        <p className="text-muted-foreground text-sm font-medium">Download research assets for client presentations and campaign strategy.</p>
      </div>

      {doneCount === 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5 p-8 flex items-center gap-6">
          <AlertCircle className="text-amber-500" size={32} />
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest text-amber-500 mb-1">Archive Locked</h4>
            <p className="text-xs text-amber-500/60 font-medium leading-relaxed">Agents must complete analysis before system exports can be generated for the current context.</p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {exports.map((exp, i) => (
          <Card key={i} className={`border-border bg-card/30 transition-all duration-300 hover:border-foreground/20 flex flex-col ${exp.disabled ? 'opacity-40 grayscale cursor-not-allowed' : 'opacity-100'}`}>
            <CardHeader>
              <div className={`w-12 h-12 rounded-2xl bg-background border border-border flex items-center justify-center mb-4 ${exp.color}`}>
                <exp.icon size={24} />
              </div>
              <CardTitle className="text-sm font-black uppercase tracking-widest">{exp.title}</CardTitle>
              <CardDescription className="text-[10px] leading-relaxed h-10">{exp.desc}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button variant="outline" className="w-full font-bold uppercase tracking-widest text-[9px] h-9" disabled={exp.disabled} onClick={exp.action}>
                Download Asset
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
