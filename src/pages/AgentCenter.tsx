'use client';

import { useState } from 'react';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	Zap,
	Database,
	Brain,
	Loader2,
	Sparkles,
	Target,
	TrendingUp,
	Hash,
	Key,
	Activity,
	ShieldAlert,
	Cpu,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AGENT_DEFS } from '../lib/constants';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const OMEGA_X_CONFIG = {
	system_name: 'VIRALOS OMEGA X',
	version: '3.1',
	system_prompt:
		'You are VIRALOS OMEGA X v3.1 — a viral content intelligence operating system grounded in behavioral psychology, adaptive learning, and anti-hallucination reasoning. You receive an array of content posts (1 to N). Analyze ALL posts together. Return ONE unified JSON object only. No markdown. No preamble. No explanation outside the JSON.',

	core_rules: [
		'Every recommendation must cite a psychological mechanism or observable signal.',
		'Label uncertainty: [OBSERVED], [INFERRED], or [PREDICTED] — never fabricate.',
		'Specificity over volume. 2 exceptional insights beat 8 generic ones.',
		'Never output generic advice. Ground every string in the input data.',
		'Return only valid JSON matching the output schema exactly.',
	],

	psychology_stack: [
		'Zeigarnik Effect',
		'Pattern Recognition Betrayal',
		'Loss Aversion',
		'Identity Threat',
		'Variable Reward',
		'Social Proof Anxiety',
		'Tribal Signaling',
		'Contrast Effect',
	],

	input_schema: {
		type: 'array',
		items: {
			caption: 'string (optional)',
			hashtags: 'string[] (optional)',
			mentions: 'string[] (optional)',
			commentsCount: 'number (optional)',
			likesCount: 'number (optional)',
			videoViewCount: 'number (optional)',
			videoPlayCount: 'number (optional)',
			transcript: 'string (optional)',
		},
	},

	engines: {
		opportunity_engine: {
			tasks: [
				'Extract engagement signals from metrics (likes/views ratio, play/view ratio)',
				'Find whitespace: topics present in transcripts but absent in hashtags',
				'Generate contrarian angles on the dominant content theme',
				'Score top opportunities on novelty, demand, and virality fit',
				'Populate topicGapMap and competitorIntelAnal from findings',
			],
		},
		content_engine: {
			tasks: [
				'Select strongest psychology trigger per hook',
				'Generate 6–8 hooks, each labeled with its trigger from psychology_stack',
				"Format: '[TriggerName] Hook text here'",
				'Populate retensionAnal from play/view ratios and transcript pacing signals',
				'Populate patternRecogonition from cross-post signal patterns',
			],
		},
		innovation_lab: {
			tasks: [
				'Identify underused content formats from the input',
				'Generate contrarian or breakout content angles',
				'Stress test each angle: scroll-stop, shareability, retention, scalability',
				'Feed findings into contentStrategy',
			],
		},
		adaptive_learning_engine: {
			tasks: [
				'If metrics exist: rank posts by engagement rate (likes/views), detect what highest performers share',
				'If metrics absent: generate [PREDICTED] benchmarks from content signals',
				'Extract winning hooks, formats, and topic patterns',
				'Reduce weak patterns from low-performing posts',
				'Feed all learnings into contentStrategy and patternRecogonition',
			],
		},
		anti_hallucination_firewall: {
			rules: [
				'No invented signals',
				'No generic pains not present in input',
				'No unsupported confidence scores',
				'Flag every uncertain claim with [INFERRED] or [PREDICTED]',
				'All hashtags must come from input or be directly derivable from content themes',
			],
		},
	},

	output_schema: {
		hooks: 'string[] — 6–8 hooks, each prefixed with [PsychTrigger]',
		retensionAnal:
			'string[] — 3–5 retention observations with metric reasoning or [PREDICTED] labels',
		topicGapMap:
			'string[] — 3–5 underserved topic angles not covered by current content',
		patternRecogonition:
			'string[] — 3–5 cross-post patterns with signal source cited',
		competitorIntelAnal:
			'string[] — 3–5 competitive insights inferred from mentions and hashtag landscape',
		contentStrategy:
			'string[] — 5–7 specific next-action recommendations grounded in findings',
		importantHastags:
			'string[] — 5–10 high-leverage hashtags with rationale appended after colon',
		importantKeywords:
			'string[] — 5–10 high-leverage keywords/phrases with psychological or SEO rationale appended after colon',
	},

	user_instruction:
		'Run full VIRALOS OMEGA X v3.1 pipeline using all engines on the provided input array. Apply adaptive learning, anti-hallucination firewall, and psychology stack at every step. Return ONE valid JSON object matching output_schema exactly. No markdown. No extra text.',
};

export default function AgentCenter({ agentStates, runAgent, reelInput }: any) {
	const queryClient = useQueryClient();
	const [selectedRunId, setSelectedRunId] = useState<string>('');

	const { data: runs = [] } = useQuery({
		queryKey: ['runs'],
		queryFn: async () => {
			const res = await fetch(`${BACKEND_URL}/api/runs`);
			return res.json();
		},
	});

	const { data: analysis, isLoading: analysisLoading } = useQuery({
		queryKey: ['analysis', selectedRunId],
		queryFn: async () => {
			const res = await fetch(
				`${BACKEND_URL}/api/runs/${selectedRunId}/analysis`,
			);
			return res.json();
		},
		enabled: !!selectedRunId,
	});

	const omegaMutation = useMutation({
		mutationFn: async (runId: string) => {
			const reelsRes = await fetch(`${BACKEND_URL}/api/runs/${runId}/reels`);
			const reels = await reelsRes.json();

			const aiInput = reels.map((r: any) => ({
				caption: r.caption,
				hashtags: r.hashtags,
				mentions: r.mentions,
				commentsCount: r.commentsCount,
				likesCount: r.likesCount,
				videoViewCount: r.videoViewCount,
				videoPlayCount: r.videoPlayCount,
				transcript: r.transcript,
			}));

			const fullPrompt = `
${OMEGA_X_CONFIG.system_prompt}

CORE RULES:
${OMEGA_X_CONFIG.core_rules.join('\n')}

PSYCHOLOGY STACK:
${OMEGA_X_CONFIG.psychology_stack.join(', ')}

ENGINES & PIPELINES:
${JSON.stringify(OMEGA_X_CONFIG.engines, null, 2)}

OUTPUT SCHEMA (STRICTLY ADHERE TO THIS):
${JSON.stringify(OMEGA_X_CONFIG.output_schema, null, 2)}

USER INSTRUCTION:
${OMEGA_X_CONFIG.user_instruction}

INPUT DATA:
${JSON.stringify(aiInput, null, 2)}
`;

			const response = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						contents: [
							{
								parts: [
									{
										text: fullPrompt,
									},
								],
							},
						],
						generationConfig: {
							response_mime_type: 'application/json',
						},
					}),
				},
			);

			const data = await response.json();
			if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
				throw new Error('Invalid AI response structure');
			}

			let rawResult = data.candidates[0].content.parts[0].text;

			// Handle potential markdown wrapping
			if (rawResult.includes('```json')) {
				rawResult = rawResult.split('```json')[1].split('```')[0].trim();
			} else if (rawResult.includes('```')) {
				rawResult = rawResult.split('```')[1].split('```')[0].trim();
			}

			const result = JSON.parse(rawResult);

			await fetch(`${BACKEND_URL}/api/runs/${runId}/analysis`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(result),
			});

			return result;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['analysis'] });
		},
	});

	return (
		<div className='max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20'>
			{/* COMMAND HEADER */}
			<header className='bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6'>
				<div className='flex items-center gap-4'>
					<div className='flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner'>
						<Cpu size={24} />
					</div>
					<div>
						<h2 className='text-xl font-bold tracking-tight text-foreground leading-none'>
							Intelligence Command
						</h2>
						<p className='text-xs text-muted-foreground mt-1 font-medium uppercase tracking-widest opacity-60'>
							VIRALOS OMEGA X v3.1
						</p>
					</div>
				</div>

				<div className='flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto'>
					<div className='relative w-full sm:w-64'>
						<Database
							className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
							size={14}
						/>
						<select
							className='w-full h-10 pl-10 pr-8 rounded-xl border border-border bg-background text-[11px] font-bold uppercase tracking-tight focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer'
							value={selectedRunId}
							onChange={(e) => setSelectedRunId(e.target.value)}
						>
							<option value=''>Select Target Run</option>
							{runs.map((run: any) => (
								<option
									key={run._id}
									value={run._id}
								>
									{run.name || 'Untitled Run'}
								</option>
							))}
						</select>
					</div>

					<Button
						size='sm'
						className='w-full sm:w-auto h-10 px-6 rounded-xl bg-primary text-primary-foreground font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all'
						disabled={!selectedRunId || omegaMutation.isPending}
						onClick={() => omegaMutation.mutate(selectedRunId)}
					>
						{omegaMutation.isPending ? (
							<Loader2
								className='animate-spin mr-2'
								size={14}
							/>
						) : (
							<Zap
								size={14}
								className='mr-2 fill-current'
							/>
						)}
						Execute Parallel Pipeline
					</Button>
				</div>
			</header>

			{/* AGENT TABS */}
			<Tabs
				defaultValue='omega'
				className='space-y-6'
			>
				<div className='flex items-center justify-between border-b border-border pb-1'>
					<TabsList className='bg-transparent h-auto p-0 gap-1 flex-wrap justify-start'>
						<TabsTrigger
							value='omega'
							className='px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-t-lg data-[state=active]:bg-primary/5 data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary transition-all'
						>
							<Sparkles
								size={12}
								className='mr-2'
							/>{' '}
							OMEGA X Output
						</TabsTrigger>
						{AGENT_DEFS.map((agent) => (
							<TabsTrigger
								key={agent.id}
								value={agent.id}
								className='px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-t-lg data-[state=active]:bg-secondary/10 data-[state=active]:text-foreground border-b-2 border-transparent data-[state=active]:border-foreground/40 transition-all opacity-60 data-[state=active]:opacity-100'
							>
								{agent.name}
							</TabsTrigger>
						))}
					</TabsList>
				</div>

				{/* OMEGA X CONTENT */}
				<TabsContent
					value='omega'
					className='mt-0 focus-visible:outline-none'
				>
					{analysisLoading ? (
						<div className='h-[400px] flex flex-col items-center justify-center gap-4 text-muted-foreground/30'>
							<Loader2
								className='animate-spin'
								size={32}
							/>
							<p className='text-xs font-bold uppercase tracking-[0.2em]'>
								Accessing Intelligence Bank...
							</p>
						</div>
					) : !analysis ? (
						<div className='h-[400px] flex flex-col items-center justify-center gap-4 text-center border-2 border-dashed border-border rounded-3xl bg-muted/5'>
							<Brain
								size={48}
								className='text-muted-foreground/10'
							/>
							<div className='space-y-1'>
								<p className='text-sm font-bold text-muted-foreground'>
									Neural Pipeline Ready
								</p>
								<p className='text-xs text-muted-foreground/60'>
									Select a run and execute the parallel pipeline to generate
									OMEGA X insights.
								</p>
							</div>
						</div>
					) : (
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-700'>
							<AnalysisSection
								title='Viral Hooks'
								icon={<Zap className='text-amber-500' />}
								items={analysis.hooks}
								psychology='Variable Reward'
							/>
							<AnalysisSection
								title='Retention Matrix'
								icon={<Activity className='text-blue-500' />}
								items={analysis.retensionAnal}
								psychology='Zeigarnik Effect'
							/>
							<AnalysisSection
								title='Topic Gap Map'
								icon={<Target className='text-emerald-500' />}
								items={analysis.topicGapMap}
								psychology='Novelty Seeking'
							/>
							<AnalysisSection
								title='Pattern Recog'
								icon={<Brain className='text-purple-500' />}
								items={analysis.patternRecogonition}
								psychology='Pattern Betrayal'
							/>
							<AnalysisSection
								title='Strategy Lab'
								icon={<TrendingUp className='text-primary' />}
								items={analysis.contentStrategy}
								psychology='Identity Threat'
							/>
							<AnalysisSection
								title='Keyword Signal'
								icon={<Key className='text-cyan-500' />}
								items={analysis.importantKeywords}
								psychology='Tribal Signaling'
							/>

							<div className='md:col-span-2 lg:col-span-3'>
								<Card className='bg-muted/10 border-border rounded-2xl overflow-hidden'>
									<CardHeader className='p-4 border-b border-border bg-background/50'>
										<div className='flex items-center gap-2'>
											<Hash
												size={14}
												className='text-primary'
											/>
											<h4 className='text-[10px] font-black uppercase tracking-widest'>
												Leverage Hashtags
											</h4>
										</div>
									</CardHeader>
									<CardContent className='p-4 flex flex-wrap gap-2'>
										{analysis.importantHastags?.map(
											(tag: string, i: number) => (
												<Badge
													key={i}
													variant='outline'
													className='px-3 py-1 text-[11px] font-medium bg-background border-border hover:border-primary transition-colors cursor-default'
												>
													{tag}
												</Badge>
											),
										)}
									</CardContent>
								</Card>
							</div>
						</div>
					)}
				</TabsContent>

				{/* INDIVIDUAL AGENT CONTENT */}
				{AGENT_DEFS.map((agent) => (
					<TabsContent
						key={agent.id}
						value={agent.id}
						className='mt-0 focus-visible:outline-none'
					>
						<div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
							<div className='lg:col-span-4 space-y-6'>
								<Card className='bg-card border-border rounded-2xl overflow-hidden shadow-sm'>
									<div
										className={`h-1.5 w-full ${agent.color.replace('text-', 'bg-')}`}
									/>
									<CardHeader className='p-6'>
										<div className='flex items-center gap-3'>
											<div
												className={`p-2.5 rounded-xl bg-background border border-border ${agent.color}`}
											>
												<agent.icon size={20} />
											</div>
											<CardTitle className='text-sm font-bold uppercase tracking-tight'>
												{agent.name}
											</CardTitle>
										</div>
										<CardDescription className='text-xs mt-2 leading-relaxed'>
											{agent.desc}
										</CardDescription>
									</CardHeader>
									<CardContent className='p-6 pt-0 space-y-4'>
										<Button
											className='w-full font-bold uppercase tracking-widest h-11 rounded-xl shadow-lg shadow-primary/10'
											disabled={
												!reelInput ||
												agentStates[agent.id]?.status === 'running'
											}
											onClick={() => runAgent(agent.id)}
										>
											{agentStates[agent.id]?.status === 'running' ? (
												<Loader2
													className='animate-spin mr-2'
													size={16}
												/>
											) : (
												<Zap
													size={16}
													className='mr-2'
												/>
											)}
											Execute Single Analysis
										</Button>
									</CardContent>
								</Card>

								<Card className='bg-background border-border rounded-2xl p-5 space-y-3'>
									<div className='flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
										<ShieldAlert
											size={12}
											className='text-amber-500'
										/>{' '}
										Security Status
									</div>
									<div className='flex items-center gap-3'>
										<div className='w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse' />
										<span className='text-[10px] font-bold uppercase tracking-tight'>
											Anti-Hallucination Active
										</span>
									</div>
								</Card>
							</div>

							<div className='lg:col-span-8'>
								<Card className='bg-card border-border rounded-2xl h-full min-h-[400px] flex flex-col overflow-hidden shadow-xl'>
									<div className='p-4 border-b border-border bg-muted/20 flex justify-between items-center'>
										<div className='flex items-center gap-2'>
											<div className='flex h-5 w-5 items-center justify-center rounded-md bg-background border border-border'>
												<Activity
													size={10}
													className='text-primary'
												/>
											</div>
											<span className='text-[10px] font-black uppercase tracking-widest'>
												Neural Stream
											</span>
										</div>
										<Badge
											variant='outline'
											className='text-[9px] font-black uppercase border-none bg-primary/5 text-primary'
										>
											{agentStates[agent.id]?.status || 'Idle'}
										</Badge>
									</div>
									<ScrollArea className='flex-1 p-6 bg-background/50'>
										<pre className='font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-foreground/80'>
											{agentStates[agent.id]?.stream ||
											agentStates[agent.id]?.data
												? JSON.stringify(
														agentStates[agent.id]?.data ||
															agentStates[agent.id]?.stream,
														null,
														2,
													)
												: 'Waiting for context initialization...'}
										</pre>
										{agentStates[agent.id]?.status === 'running' && (
											<div className='mt-4 flex items-center gap-2 text-primary font-bold text-[9px] uppercase tracking-widest animate-pulse'>
												<Loader2
													className='animate-spin'
													size={12}
												/>{' '}
												Receiving Uplink...
											</div>
										)}
									</ScrollArea>
								</Card>
							</div>
						</div>
					</TabsContent>
				))}
			</Tabs>
		</div>
	);
}

function AnalysisSection({
	title,
	icon,
	items,
	psychology,
}: {
	title: string;
	icon: React.ReactNode;
	items: string[];
	psychology: string;
}) {
	return (
		<Card className='bg-card border-border rounded-2xl overflow-hidden hover:border-primary/20 transition-all duration-300 group'>
			<CardHeader className='p-4 pb-2 border-b border-border/40 bg-muted/10'>
				<div className='flex justify-between items-center'>
					<div className='flex items-center gap-2'>
						{icon}
						<h4 className='text-[11px] font-black uppercase tracking-tight'>
							{title}
						</h4>
					</div>
					<Badge
						variant='secondary'
						className='bg-background border-border text-[8px] font-black uppercase tracking-tighter h-5'
					>
						{psychology}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className='p-4 space-y-3'>
				{items?.slice(0, 5).map((item, i) => (
					<div
						key={i}
						className='flex gap-3 text-[11px] leading-relaxed font-medium text-muted-foreground group-hover:text-foreground transition-colors'
					>
						<span className='text-primary/40 shrink-0 font-black'>
							0{i + 1}
						</span>
						<span className='line-clamp-3 italic'>"{item}"</span>
					</div>
				))}
			</CardContent>
		</Card>
	);
}
