import { useState, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
	Terminal,
	LayoutDashboard,
	Database,
	Terminal as AgentIcon,
	LineChart,
	Cpu,
	ChevronRight,
	Power,
	Download,
	Activity,
	Circle,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { TooltipProvider } from '@/components/ui/tooltip';

import Dashboard from './pages/Dashboard';
import ReelInput from './pages/ReelInput';
import AgentCenter from './pages/AgentCenter';
import InsightsBoard from './pages/InsightsBoard';
import StrategyLab from './pages/StrategyLab';
import Archive from './pages/Archive';

import {
	AGENT_DEFS,
	type AgentState,
	type ScrapeResult,
} from './lib/constants';

const APIFY_API_KEY = import.meta.env.VITE_APIFY_API_KEY;
const APIFY_ACTOR_ID = import.meta.env.VITE_APIFY_ACTOR_ID;
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function App() {
	const navigate = useNavigate();
	const location = useLocation();
	const queryClient = useQueryClient();
	const activeTab =
		location.pathname === '/' ? 'dashboard' : location.pathname.slice(1);

	// Global UI States
	const [reelInput, setReelInput] = useState('');
	const [agentStates, setAgentStates] = useState<Record<string, AgentState>>(
		Object.fromEntries(
			AGENT_DEFS.map((a) => [a.id, { status: 'idle', data: null, stream: '' }]),
		),
	);
	const [scrapedData, setScrapedData] = useState<ScrapeResult[]>([]);
	const [isScraping, setIsScraping] = useState(false);
	const [scrapeProgress, setScrapeProgress] = useState(0);
	const [scrapeError, setScrapeError] = useState<string | null>(null);

	// React Query Mutation for Scraper
	const scraperMutation = useMutation({
		mutationFn: async ({
			urls,
			usernames,
			runName,
		}: {
			urls: string[];
			usernames: string[];
			runName?: string;
		}) => {
			if (!APIFY_API_KEY) throw new Error('Apify API key required.');

			setScrapeProgress(5);
			let localRunId = null;

			// 1. Create local run
			try {
				const lRunRes = await fetch(`${BACKEND_URL}/api/runs`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						status: 'pending',
						name: runName || undefined,
					}),
				});
				if (lRunRes.ok) {
					const lRun = await lRunRes.json();
					localRunId = lRun._id;
				}
			} catch (err) {
				console.warn('Backend offline', err);
			}

			// 2. Start Apify
			const runRes = await fetch(
				`https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs?token=${APIFY_API_KEY}`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						directUrls: urls,
						username: usernames.length > 0 ? usernames : urls,
						resultsLimit: 100,
					}),
				},
			);
			const runData = await runRes.json();
			if (!runRes.ok)
				throw new Error(runData.error?.message || 'Scraper start failed');
			const apifyRunId = runData.data.id;

			setScrapeProgress(30);
			let status = 'RUNNING';
			while (status === 'RUNNING' || status === 'READY') {
				await new Promise((r) => setTimeout(r, 3000));
				const statusRes = await fetch(
					`https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs/${apifyRunId}?token=${APIFY_API_KEY}`,
				);
				const statusData = await statusRes.json();
				status = statusData.data.status;
				setScrapeProgress((prev) => Math.min(prev + 5, 90));
			}

			// 3. Get results
			const datasetId = runData.data.defaultDatasetId;
			const datasetRes = await fetch(
				`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_KEY}`,
			);
			const items = await datasetRes.json();

			// 4. Save to local backend
			if (localRunId) {
				await fetch(`${BACKEND_URL}/api/runs/${localRunId}/reels`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ reels: items }),
				});
			}

			return { items, localRunId };
		},
		onSuccess: (data) => {
			const processed: ScrapeResult[] = data.items.map((item: any) => ({
				id: item.id || Math.random().toString(36).substr(2, 9),
				url: item.url || '',
				caption: item.caption || item.text || '',
				transcript:
					item.transcript || item.videoTranscript || item.description || '',
				timestamp: new Date().toISOString(),
			}));

			setScrapedData(processed);
			const newContext = processed
				.map(
					(d) =>
						`[SCRAPED_NODE]\nURL: ${d.url}\nCAPTION: ${d.caption}\n${d.transcript ? `TRANSCRIPT: ${d.transcript}\n` : ''}---`,
				)
				.join('\n\n');
			setReelInput((prev) => (prev ? `${prev}\n\n${newContext}` : newContext));
			setScrapeProgress(100);
			queryClient.invalidateQueries({ queryKey: ['runs'] });

			setTimeout(() => {
				setIsScraping(false);
				setScrapeProgress(0);
			}, 1000);
		},
		onError: (error: any) => {
			setScrapeError(error.message);
			setIsScraping(false);
			setScrapeProgress(0);
			// We don't have localRunId here easily without extra state, but that's fine for now
		},
	});

	const startScraper = (
		urls: string[],
		usernames: string[],
		runName?: string,
	) => {
		setIsScraping(true);
		setScrapeError(null);
		scraperMutation.mutate({ urls, usernames, runName });
	};

	const reelCount = useMemo(
		() => reelInput.split('\n').filter((l) => l.trim()).length,
		[reelInput],
	);
	const doneCount = Object.values(agentStates).filter(
		(s) => s.status === 'done',
	).length;

	const runAgent = async (agentId: string) => {
		if (!GEMINI_API_KEY) return;
		setAgentStates((prev) => ({
			...prev,
			[agentId]: { ...prev[agentId], status: 'running', stream: '' },
		}));

		try {
			const agent = AGENT_DEFS.find((a) => a.id === agentId)!;
			const prompt = `CONTEXT:\n${reelInput}\n\nTASK: ${agent.systemPrompt}\n\nFORMAT: Provide a detailed JSON response matching the strategic goals of a ${agent.name}.`;

			const response = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${GEMINI_API_KEY}`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
				},
			);

			const reader = response.body?.getReader();
			let fullText = '';
			if (reader) {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					const chunk = new TextDecoder().decode(value);
					const lines = chunk.split('\n');
					for (const line of lines) {
						if (line.startsWith('data: ')) {
							try {
								const data = JSON.parse(line.slice(6));
								const text = data.candidates[0].content.parts[0].text;
								fullText += text;
								setAgentStates((prev) => ({
									...prev,
									[agentId]: { ...prev[agentId], stream: fullText },
								}));
							} catch (e) {}
						}
					}
				}
			}

			const jsonMatch = fullText.match(/\{[\s\S]*\}/);
			const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: fullText };
			setAgentStates((prev) => ({
				...prev,
				[agentId]: { status: 'done', data: result, stream: '' },
			}));
		} catch (e) {
			setAgentStates((prev) => ({
				...prev,
				[agentId]: {
					status: 'error',
					data: null,
					stream: 'Agent Failed to synthesize context.',
				},
			}));
		}
	};

	const runAll = () => {
		AGENT_DEFS.forEach((agent, i) => {
			setTimeout(() => runAgent(agent.id), i * 300);
		});
	};

	const handleResetSession = () => {
		if (confirm('Clear current research session?')) {
			setAgentStates(
				Object.fromEntries(
					AGENT_DEFS.map((a) => [
						a.id,
						{ status: 'idle', data: null, stream: '' },
					]),
				),
			);
			setReelInput('');
			setScrapedData([]);
			queryClient.invalidateQueries({ queryKey: ['runs'] });
		}
	};

	const sidebarItems = [
		{ id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
		{ id: 'input', label: 'Reel Input', icon: Database },
		{ id: 'agents', label: 'Agent Center', icon: AgentIcon },
		{ id: 'insights', label: 'Insights', icon: LineChart },
		{ id: 'recommendations', label: 'Strategy Lab', icon: Cpu },
		{ id: 'export', label: 'Archive', icon: Download },
	];

	return (
		<TooltipProvider>
			<div className='dark flex h-screen bg-background text-foreground font-sans overflow-hidden antialiased selection:bg-primary/20'>
				{/* SIDEBAR */}
				<aside className='w-64 border-r border-border bg-card/30 flex flex-col z-20 backdrop-blur-md'>
					<div className='h-14 flex items-center px-5 border-b border-border/40 gap-3'>
						<div className='flex h-7 w-7 items-center justify-center rounded-lg bg-primary shadow-sm'>
							<Terminal
								className='text-primary-foreground stroke-[2.5px]'
								size={14}
							/>
						</div>
						<div className='flex flex-col'>
							<span className='text-[14px] font-bold tracking-tight text-foreground leading-none'>
								ReelOS
							</span>
							<span className='text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest mt-0.5'>
								v2.0 Neural
							</span>
						</div>
					</div>

					<nav className='flex-1 px-3 py-6 space-y-1'>
						{sidebarItems.map((item) => (
							<button
								key={item.id}
								onClick={() =>
									navigate(item.id === 'dashboard' ? '/' : `/${item.id}`)
								}
								className={`w-full group flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 active:scale-95 ${
									activeTab === item.id
										? 'bg-secondary text-secondary-foreground shadow-sm'
										: 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
								}`}
							>
								<item.icon
									size={16}
									className={`${activeTab === item.id ? 'text-primary' : 'opacity-60 group-hover:opacity-100 transition-opacity'}`}
								/>
								{item.label}
								{item.id === 'agents' && doneCount > 0 && (
									<Badge
										variant='secondary'
										className='ml-auto h-5 px-1.5 text-[10px] bg-primary/10 text-primary border-none rounded-full'
									>
										{doneCount}
									</Badge>
								)}
							</button>
						))}
					</nav>

					<div className='p-4 m-3 rounded-xl bg-card border border-border/60 space-y-4'>
						<div className='space-y-2'>
							<div className='flex justify-between items-center text-[11px] font-medium'>
								<span className='text-muted-foreground'>Session Progress</span>
								<span className='text-foreground tabular-nums'>
									{Math.round((doneCount / 6) * 100)}%
								</span>
							</div>
							<Progress
								value={(doneCount / 6) * 100}
								className='h-1 bg-muted rounded-full'
							/>
						</div>
						<div className='flex items-center gap-2'>
							<div className='relative flex h-2 w-2'>
								<span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-40'></span>
								<Circle className='relative inline-flex h-2 w-2 fill-emerald-500 text-emerald-500' />
							</div>
							<span className='text-[11px] font-medium text-muted-foreground'>
								System Online
							</span>
						</div>
					</div>
				</aside>

				{/* MAIN CONTENT AREA */}
				<div className='flex-1 flex flex-col relative overflow-hidden'>
					<div className='absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none' />

					<header className='h-14 border-b border-border bg-background/50 backdrop-blur-md flex items-center justify-between px-6 z-10'>
						<div className='flex items-center gap-2.5'>
							<span className='text-[12px] font-medium text-muted-foreground'>
								Home
							</span>
							<ChevronRight
								size={14}
								className='text-muted-foreground/30'
							/>
							<span className='text-[12px] font-semibold text-foreground capitalize tracking-tight'>
								{activeTab}
							</span>
						</div>

						<div className='flex items-center gap-2'>
							<div className='flex items-center gap-1.5 mr-2'>
								<Badge
									variant='outline'
									className='text-[11px] font-medium h-7 px-2.5 border-border rounded-lg bg-card/50'
								>
									<Activity
										size={12}
										className='mr-1.5 text-muted-foreground'
									/>
									{reelCount}
								</Badge>
								{doneCount > 0 && (
									<Badge className='text-[11px] font-medium h-7 px-2.5 bg-emerald-500/10 text-emerald-500 border-none rounded-lg'>
										{doneCount} Analysis Ready
									</Badge>
								)}
							</div>
							<Separator
								orientation='vertical'
								className='h-4 mx-2'
							/>
							<Button
								variant='ghost'
								size='icon'
								className='h-8 w-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all active:scale-90'
								onClick={handleResetSession}
							>
								<Power size={15} />
							</Button>
						</div>
					</header>

					<main className='flex-1 overflow-y-auto scroll-smooth'>
						<div className='max-w-5xl mx-auto p-8 lg:p-12 min-h-full'>
							<div className='transition-all duration-300'>
								<Routes>
									<Route
										path='/'
										element={
											<Dashboard
												reelCount={reelCount}
												doneCount={doneCount}
												agentStates={agentStates}
											/>
										}
									/>
									<Route
										path='/input'
										element={
											<ReelInput
												reelInput={reelInput}
												setReelInput={setReelInput}
												startScraper={startScraper}
												isScraping={isScraping}
												scrapeProgress={scrapeProgress}
												scrapeError={scrapeError}
												scrapedData={scrapedData}
											/>
										}
									/>
									<Route
										path='/agents'
										element={
											<AgentCenter
												agentStates={agentStates}
												runAgent={runAgent}
												runAll={runAll}
												reelInput={reelInput}
											/>
										}
									/>
									<Route
										path='/insights'
										element={<InsightsBoard agentStates={agentStates} />}
									/>
									<Route
										path='/recommendations'
										element={<StrategyLab agentStates={agentStates} />}
									/>
									<Route
										path='/export'
										element={
											<Archive
												reelInput={reelInput}
												agentStates={agentStates}
											/>
										}
									/>
								</Routes>
							</div>
						</div>
					</main>
				</div>
			</div>
		</TooltipProvider>
	);
}
