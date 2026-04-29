'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import {
	Search,
	Brain,
	Calendar,
	History,
	ChevronDown,
	ChevronUp,
	Link2,
	MessageSquare,
	Heart,
	Play,
	User,
	Activity,
	Loader2,
	Clock,
	Eye,
	Share2,
	Sparkles,
	Zap,
	TrendingUp,
	Lightbulb,
	Database,
	AlertCircle,
} from 'lucide-react';
import { AGENT_DEFS } from '../lib/constants';

export default function InsightsBoard({ agentStates }: any) {
	const [expandedRun, setExpandedRun] = useState<string | null>(null);
	const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

	const { data: runs = [], isLoading: runsLoading } = useQuery({
		queryKey: ['runs'],
		queryFn: async () => {
			const res = await fetch(`${BACKEND_URL}/api/runs`);
			if (!res.ok) throw new Error('Failed to fetch runs');
			return res.json();
		},
	});

	const doneAgents = AGENT_DEFS.filter(
		(a) => agentStates[a.id]?.status === 'done',
	);

	return (
		<div className='max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 font-sans text-foreground'>
			<header className='flex flex-col gap-1 border-b border-border pb-6'>
				<h2 className='text-2xl font-bold tracking-tight'>
					Intelligence{' '}
					<span className='text-muted-foreground/70'>Repository</span>
				</h2>
				<p className='text-sm text-muted-foreground'>
					Cross-agent findings and historical research depth.
				</p>
			</header>

			{/* ACTIVE AGENT INSIGHTS (IF ANY) */}
			{doneAgents.length > 0 && (
				<section className='space-y-4'>
					<div className='flex items-center gap-2 px-1'>
						<Brain
							size={14}
							className='text-primary'
						/>
						<h3 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
							Active Session Synthesis
						</h3>
					</div>

					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						{doneAgents.map((agent) => {
							const data = agentStates[agent.id].data;
							return (
								<Card
									key={agent.id}
									className='overflow-hidden border-border bg-card rounded-xl transition-all duration-200 hover:shadow-sm'
								>
									<div
										className={`h-1 w-full ${agent.color.replace('text-', 'bg-')}`}
									/>
									<CardHeader className='p-4 pb-2'>
										<div className='flex justify-between items-center'>
											<div className='flex items-center gap-2'>
												<agent.icon
													className={agent.color}
													size={16}
												/>
												<CardTitle className='text-sm font-bold tracking-tight'>
													{agent.name}
												</CardTitle>
											</div>
											<Badge
												variant='secondary'
												className='h-5 px-1.5 text-[10px] font-medium bg-primary/5 text-primary border-none'
											>
												Active
											</Badge>
										</div>
									</CardHeader>
									<CardContent className='p-4 pt-2 space-y-4'>
										<div className='p-3 rounded-lg bg-muted/30 border-l-2 border-primary text-sm italic leading-snug'>
											"{data.topInsight || 'Synthesizing strategic context...'}"
										</div>

										<div className='grid grid-cols-2 gap-4'>
											{Object.entries(data)
												.filter(
													([k]) =>
														k !== 'topInsight' &&
														!k.toLowerCase().includes('score') &&
														!k.toLowerCase().includes('confidence'),
												)
												.slice(0, 4)
												.map(([key, val]: any) => (
													<div
														key={key}
														className='space-y-1'
													>
														<Label className='text-[10px] font-bold uppercase tracking-tight text-muted-foreground/80'>
															{key.replace(/([A-Z])/g, ' $1')}
														</Label>
														<div className='text-xs font-medium line-clamp-2'>
															{Array.isArray(val) ? val[0] : String(val)}
														</div>
													</div>
												))}
										</div>
									</CardContent>
								</Card>
							);
						})}
					</div>
				</section>
			)}

			{/* HISTORICAL RESEARCH REPOSITORY */}
			<section className='space-y-4'>
				<div className='flex items-center gap-2 px-1'>
					<History
						size={14}
						className='text-primary'
					/>
					<h3 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
						Neural Archives
					</h3>
				</div>

				{runsLoading ? (
					<div className='py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground/50'>
						<Loader2
							className='animate-spin'
							size={24}
						/>
						<span className='text-xs font-medium uppercase tracking-tighter'>
							Accessing...
						</span>
					</div>
				) : runs.length === 0 ? (
					<Card className='p-12 border-dashed border-border bg-transparent rounded-xl flex flex-col items-center justify-center text-center space-y-3'>
						<Search
							size={32}
							className='text-muted-foreground/20'
						/>
						<p className='text-xs font-medium text-muted-foreground'>
							No previous sessions detected.
						</p>
					</Card>
				) : (
					<div className='space-y-2'>
						{runs.map((run: any) => (
							<RunInsightGroup
								key={run._id}
								run={run}
								isExpanded={expandedRun === run._id}
								onToggle={() =>
									setExpandedRun(expandedRun === run._id ? null : run._id)
								}
							/>
						))}
					</div>
				)}
			</section>
		</div>
	);
}

function RunInsightGroup({ run, isExpanded, onToggle }: any) {
	const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
	const { data: analysis, isLoading: analysisLoading } = useQuery({
		queryKey: ['analysis', run._id],
		queryFn: async () => {
			const res = await fetch(`${BACKEND_URL}/api/runs/${run._id}/analysis`);
			return res.json();
		},
		enabled: isExpanded,
	});

	const { data: reels = [], isLoading: reelsLoading } = useQuery({
		queryKey: ['reels', run._id],
		queryFn: async () => {
			const res = await fetch(`${BACKEND_URL}/api/runs/${run._id}/reels`);
			return res.json();
		},
		enabled: isExpanded,
	});

	return (
		<Card
			className={`overflow-hidden border-border bg-card rounded-xl transition-all duration-200 ${isExpanded ? 'shadow-sm' : 'hover:bg-muted/20'}`}
		>
			<div
				className='p-3 sm:p-4 flex items-center justify-between cursor-pointer group select-none'
				onClick={onToggle}
			>
				<div className='flex items-center gap-4'>
					<div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted border border-border group-hover:bg-background transition-colors'>
						<Calendar
							size={18}
							className={
								isExpanded ? 'text-primary' : 'text-muted-foreground/60'
							}
						/>
					</div>
					<div>
						<h4 className='text-sm font-bold tracking-tight'>
							{run.name ||
								`Session ${new Date(run.timestamp).toLocaleDateString()}`}
						</h4>
						<div className='flex items-center gap-2 mt-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-tight'>
							<span>
								{new Date(run.timestamp).toLocaleTimeString([], {
									hour: '2-digit',
									minute: '2-digit',
								})}
							</span>
							<span className='w-1 h-1 rounded-full bg-border' />
							<span className='text-primary/80'>
								{run.totalItems || 0} Nodes
							</span>
							{analysis && (
								<>
									<span className='w-1 h-1 rounded-full bg-border' />
									<span className='text-emerald-500 flex items-center gap-1'>
										<Sparkles size={10} /> OMEGA Intelligence Ready
									</span>
								</>
							)}
						</div>
					</div>
				</div>
				<Button
					variant='ghost'
					size='icon'
					className='h-8 w-8 rounded-lg active:scale-95 transition-all'
				>
					{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
				</Button>
			</div>

			{isExpanded && (
				<div className='px-4 pb-4 animate-in slide-in-from-top-2 duration-200'>
					<div className='border-t border-border mt-1 pt-6 space-y-8'>
						{/* OMEGA ANALYSIS SECTION */}
						{analysisLoading ? (
							<div className='h-20 flex items-center justify-center gap-3 text-muted-foreground/30'>
								<Loader2
									className='animate-spin'
									size={16}
								/>
								<span className='text-[10px] font-black uppercase tracking-widest'>
									Querying Intelligence Bank...
								</span>
							</div>
						) : analysis ? (
							<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
								<InsightCard
									title='Viral Hooks'
									icon={
										<Zap
											className='text-amber-500'
											size={14}
										/>
									}
									items={analysis.hooks}
									color='border-amber-500/20'
								/>
								<InsightCard
									title='Content Strategy'
									icon={
										<TrendingUp
											className='text-primary'
											size={14}
										/>
									}
									items={analysis.contentStrategy}
									color='border-primary/20'
								/>
								<InsightCard
									title='Pattern Recognition'
									icon={
										<Brain
											className='text-purple-500'
											size={14}
										/>
									}
									items={analysis.patternRecogonition}
									color='border-purple-500/20'
								/>
								<InsightCard
									title='Topic Gap Map'
									icon={
										<Lightbulb
											className='text-emerald-500'
											size={14}
										/>
									}
									items={analysis.topicGapMap}
									color='border-emerald-500/20'
								/>
							</div>
						) : (
							<div className='p-6 bg-muted/20 border border-dashed border-border rounded-xl flex items-center justify-between'>
								<div className='flex items-center gap-3'>
									<AlertCircle
										size={16}
										className='text-muted-foreground'
									/>
									<p className='text-[11px] font-medium text-muted-foreground'>
										No OMEGA X analysis found for this run. Execute pipeline in
										the Command Center.
									</p>
								</div>
							</div>
						)}

						{/* NODES SECTION */}
						<div className='space-y-4'>
							<div className='flex items-center gap-2'>
								<Database
									size={14}
									className='text-muted-foreground/40'
								/>
								<h5 className='text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60'>
									Individual Node Cluster
								</h5>
							</div>

							{reelsLoading ? (
								<div className='py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground/40'>
									<Loader2
										className='animate-spin'
										size={20}
									/>
									<p className='text-[10px] font-bold uppercase tracking-widest'>
										Unpacking Nodes...
									</p>
								</div>
							) : (
								<div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
									{reels.map((reel: any) => (
										<ReelCard
											key={reel._id}
											reel={reel}
										/>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</Card>
	);
}

function InsightCard({
	title,
	icon,
	items,
	color,
}: {
	title: string;
	icon: React.ReactNode;
	items: string[];
	color: string;
}) {
	return (
		<Card className={`bg-muted/10 border ${color} rounded-xl overflow-hidden`}>
			<CardHeader className='p-3 pb-1 flex flex-row items-center gap-2 border-b border-border/10'>
				{icon}
				<h6 className='text-[10px] font-black uppercase tracking-tight'>
					{title}
				</h6>
			</CardHeader>
			<CardContent className='p-3 space-y-2'>
				{items?.slice(0, 4).map((item, i) => (
					<div
						key={i}
						className='flex gap-2 text-[10px] leading-snug font-medium text-muted-foreground'
					>
						<span className='shrink-0'>•</span>
						<span className='line-clamp-2'>{item}</span>
					</div>
				))}
			</CardContent>
		</Card>
	);
}

function ReelCard({ reel }: { reel: any }) {
	const [isPlaying, setIsPlaying] = useState(false);

	return (
		<Card className='bg-muted/10 border-border/40 rounded-xl overflow-hidden hover:border-primary/20 transition-all group/reel'>
			<div className='flex flex-col md:flex-row h-full'>
				<div className='relative w-full md:w-48 lg:w-56 shrink-0 aspect-9/16 md:aspect-auto bg-black'>
					{reel.videoUrl && isPlaying ? (
						<video
							src={reel.videoUrl}
							controls
							autoPlay
							className='w-full h-full object-cover'
							onEnded={() => setIsPlaying(false)}
						/>
					) : (
						<div className='relative w-full h-full'>
							<img
								src={reel.displayUrl}
								className='w-full h-full object-cover opacity-80'
								alt=''
							/>
							<div className='absolute inset-0 bg-gradient-to-t from-black/60 to-transparent' />

							{reel.videoUrl ? (
								<button
									onClick={() => setIsPlaying(true)}
									className='absolute inset-0 flex items-center justify-center group/play'
								>
									<div className='w-12 h-12 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-2xl transform group-hover/play:scale-110 transition-all'>
										<Play
											size={24}
											fill='currentColor'
										/>
									</div>
								</button>
							) : (
								<div className='absolute inset-0 flex items-center justify-center'>
									<Badge
										variant='secondary'
										className='bg-black/50 text-white backdrop-blur-md border-none'
									>
										Image Context
									</Badge>
								</div>
							)}

							{reel.videoDuration && (
								<div className='absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1'>
									<Clock size={10} />
									{Math.round(reel.videoDuration)}s
								</div>
							)}
						</div>
					)}
				</div>

				<div className='flex-1 p-5 flex flex-col gap-4 overflow-hidden'>
					<div className='flex justify-between items-start gap-2'>
						<div className='flex items-center gap-2.5'>
							<div className='w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground overflow-hidden shrink-0 shadow-sm'>
								{reel.ownerProfilePicUrl ? (
									<img
										src={reel.ownerProfilePicUrl}
										className='w-full h-full object-cover'
										alt=''
									/>
								) : (
									<User size={16} />
								)}
							</div>
							<div className='min-w-0'>
								<p className='text-[12px] font-bold truncate leading-none text-foreground'>
									{reel.ownerFullName || reel.ownerUsername || 'Anonymous'}
								</p>
								<p className='text-[10px] font-medium text-muted-foreground mt-1'>
									@{reel.ownerUsername}
								</p>
							</div>
						</div>
						<div className='flex items-center gap-1'>
							<a
								href={reel.url}
								target='_blank'
								rel='noopener noreferrer'
								className='p-1.5 rounded-lg bg-background border border-border hover:text-primary transition-colors active:scale-95 shadow-sm'
							>
								<Link2 size={14} />
							</a>
						</div>
					</div>

					<div className='space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1'>
						<p className='text-[13px] leading-relaxed text-muted-foreground/90 font-medium italic'>
							"{reel.caption || 'No caption provided.'}"
						</p>

						<div className='flex flex-wrap gap-1.5'>
							{reel.hashtags?.slice(0, 5).map((tag: string, i: number) => (
								<span
									key={i}
									className='text-[10px] font-bold text-primary/70 hover:text-primary cursor-default transition-colors'
								>
									#{tag}
								</span>
							))}
						</div>

						{reel.transcript && (
							<div className='bg-muted/30 p-3 rounded-lg border border-border/40 space-y-2'>
								<div className='flex items-center gap-2 text-[9px] font-bold uppercase text-muted-foreground'>
									<Activity
										size={12}
										className='text-primary'
									/>{' '}
									Audio Intelligence
								</div>
								<p className='text-[11px] leading-snug font-medium opacity-80 italic'>
									"{reel.transcript}"
								</p>
							</div>
						)}
					</div>

					<div className='grid grid-cols-4 gap-2 pt-4 border-t border-border'>
						<StatItem
							icon={<Heart size={12} />}
							value={reel.likesCount}
							label='Likes'
							color='text-rose-500'
						/>
						<StatItem
							icon={<Eye size={12} />}
							value={reel.videoViewCount || reel.videoPlayCount}
							label='Reach'
							color='text-blue-500'
						/>
						<StatItem
							icon={<MessageSquare size={12} />}
							value={reel.commentsCount}
							label='Talk'
							color='text-emerald-500'
						/>
						<StatItem
							icon={<Share2 size={12} />}
							value={Math.floor((reel.likesCount || 0) / 10)}
							label='Signal'
							color='text-amber-500'
						/>
					</div>
				</div>
			</div>
		</Card>
	);
}

function StatItem({
	icon,
	value,
	label,
	color,
}: {
	icon: React.ReactNode;
	value: number;
	label: string;
	color: string;
}) {
	return (
		<div className='flex flex-col gap-0.5'>
			<div className={`flex items-center gap-1 ${color}`}>
				{icon}
				<span className='text-[11px] font-bold tabular-nums leading-none'>
					{value?.toLocaleString() || 0}
				</span>
			</div>
			<p className='text-[9px] font-bold uppercase text-muted-foreground/40 tracking-tighter'>
				{label}
			</p>
		</div>
	);
}
