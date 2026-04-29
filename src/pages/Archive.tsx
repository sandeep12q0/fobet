import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import {
	Search,
	Zap,
	Sparkles,
	Target,
	AlertCircle,
	History,
	Calendar,
	Database,
	ArrowRight,
	Loader2,
} from 'lucide-react';

export default function Archive({ reelInput, agentStates }: any) {
	const doneCount = Object.values(agentStates).filter(
		(s: any) => s.status === 'done',
	).length;
	const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

	const { data: runs = [], isLoading } = useQuery({
		queryKey: ['runs'],
		queryFn: async () => {
			const res = await fetch(`${BACKEND_URL}/api/runs`);
			if (!res.ok) throw new Error('Failed to fetch runs');
			return res.json();
		},
	});

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
				Object.entries(agentStates).map(([id, s]: any) => [id, s.data]),
			),
		};
		download(
			'ReelOS-Full-Research.json',
			JSON.stringify(data, null, 2),
			'application/json',
		);
	};

	const exports = [
		{
			title: 'Full Research JSON',
			desc: 'All agent outputs + input context',
			icon: Search,
			action: exportFullJSON,
			color: 'text-cyan-400',
		},
		{
			title: 'Hook Swipe Bank',
			desc: 'All hook templates extracted',
			icon: Zap,
			color: 'text-amber-500',
			action: () =>
				download(
					'ReelOS-Hooks.txt',
					agentStates.hook?.data?.hookSwipeBank?.join('\n\n') || '',
				),
			disabled: !agentStates.hook?.data,
		},
		{
			title: 'Content Strategy',
			desc: '30 Reel ideas in JSON format',
			icon: Sparkles,
			color: 'text-emerald-500',
			action: () =>
				download(
					'ReelOS-Strategy.json',
					JSON.stringify(agentStates.strategy?.data, null, 2),
					'application/json',
				),
			disabled: !agentStates.strategy?.data,
		},
		{
			title: 'Gap Analysis',
			desc: 'Market whitespace findings',
			icon: Target,
			color: 'text-purple-500',
			action: () =>
				download(
					'ReelOS-Gaps.json',
					JSON.stringify(agentStates.gap?.data, null, 2),
					'application/json',
				),
			disabled: !agentStates.gap?.data,
		},
	];

	return (
		<div className='space-y-12 animate-in fade-in duration-700 pb-20'>
			<div className='flex justify-between items-end'>
				<div>
					<h2 className='text-5xl font-black tracking-tighter uppercase italic leading-[0.85] mb-4'>
						Neural <br />
						<span className='text-primary'>Archive</span>
					</h2>
					<p className='text-muted-foreground text-sm font-medium uppercase tracking-widest opacity-60'>
						System exports and historical research runs.
					</p>
				</div>
			</div>

			<div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
				{/* EXPORTS COLUMN */}
				<div className='lg:col-span-2 space-y-6'>
					<h3 className='text-xs font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2'>
						<Database
							size={14}
							className='text-primary'
						/>{' '}
						Active Session Exports
					</h3>

					{doneCount === 0 && (
						<Card className='border-amber-500/20 bg-amber-500/5 p-8 flex items-center gap-6 rounded-3xl'>
							<AlertCircle
								className='text-amber-500'
								size={32}
							/>
							<div>
								<h4 className='text-sm font-black uppercase tracking-widest text-amber-500 mb-1'>
									Session Data Locked
								</h4>
								<p className='text-[10px] text-amber-500/60 font-medium leading-relaxed uppercase'>
									Complete analysis in the Agent Center to unlock exports for
									the current matrix.
								</p>
							</div>
						</Card>
					)}

					<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
						{exports.map((exp, i) => (
							<Card
								key={i}
								className={`border-border/50 bg-card/30 rounded-3xl transition-all duration-500 hover:border-primary/20 hover:bg-card/50 flex flex-col group ${exp.disabled ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}
							>
								<CardHeader className='p-8 pb-4'>
									<div
										className={`w-14 h-14 rounded-2xl bg-background border border-border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${exp.color}`}
									>
										<exp.icon
											size={28}
											strokeWidth={1.5}
										/>
									</div>
									<CardTitle className='text-base font-black uppercase tracking-tight'>
										{exp.title}
									</CardTitle>
									<CardDescription className='text-[11px] leading-relaxed mt-2 opacity-60'>
										{exp.desc}
									</CardDescription>
								</CardHeader>
								<CardContent className='p-8 pt-4 mt-auto'>
									<Button
										variant='outline'
										className='w-full font-black uppercase tracking-widest text-[10px] h-12 rounded-2xl border-border/50 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all'
										disabled={exp.disabled}
										onClick={exp.action}
									>
										Download Data Node
									</Button>
								</CardContent>
							</Card>
						))}
					</div>
				</div>

				{/* HISTORY COLUMN */}
				<div className='space-y-6'>
					<h3 className='text-xs font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2'>
						<History
							size={14}
							className='text-primary'
						/>{' '}
						Run History
					</h3>

					<Card className='bg-card/30 border-border/50 rounded-3xl overflow-hidden shadow-xl min-h-[400px] flex flex-col'>
						<div className='p-6 border-b border-border/40 bg-muted/20 flex justify-between items-center'>
							<span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
								Recent Neural Cycles
							</span>
							<Badge
								variant='outline'
								className='text-[9px] font-bold bg-background'
							>
								{runs.length} Runs
							</Badge>
						</div>

						<div className='flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar max-h-[600px]'>
							{isLoading ? (
								<div className='h-full flex flex-col items-center justify-center text-muted-foreground gap-3 opacity-40'>
									<Loader2
										className='animate-spin'
										size={24}
									/>
									<span className='text-[10px] font-bold uppercase tracking-widest'>
										Querying DB...
									</span>
								</div>
							) : runs.length === 0 ? (
								<div className='h-full flex flex-col items-center justify-center text-muted-foreground/30 py-20 text-center space-y-4'>
									<Database
										size={48}
										strokeWidth={1}
									/>
									<p className='text-[10px] font-bold uppercase tracking-widest'>
										No previous runs recorded.
									</p>
								</div>
							) : (
								runs.map((run: any) => (
									<div
										key={run._id}
										className='group relative bg-background/40 border border-border/40 rounded-2xl p-5 hover:border-primary/30 transition-all cursor-pointer'
									>
										<div className='flex justify-between items-start mb-3'>
											<div className='flex items-center gap-2.5'>
												<div
													className={`w-8 h-8 rounded-xl flex items-center justify-center ${run.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}
												>
													<Calendar size={14} />
												</div>
												<div>
													<p className='text-[11px] font-black uppercase tracking-tight'>
														{new Date(run.timestamp).toLocaleDateString()}
													</p>
													<p className='text-[9px] font-medium text-muted-foreground opacity-50'>
														{new Date(run.timestamp).toLocaleTimeString()}
													</p>
												</div>
											</div>
											<Badge
												className={`text-[8px] font-black uppercase border-none ${run.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}
											>
												{run.status}
											</Badge>
										</div>

										<div className='flex items-center justify-between mt-4 pt-4 border-t border-border/20'>
											<div className='flex items-center gap-4'>
												<div className='text-center'>
													<p className='text-[11px] font-black tabular-nums'>
														{run.totalItems || 0}
													</p>
													<p className='text-[8px] font-bold text-muted-foreground uppercase tracking-widest opacity-40'>
														Nodes
													</p>
												</div>
											</div>
											<Button
												variant='ghost'
												size='icon'
												className='h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-primary'
											>
												<ArrowRight size={16} />
											</Button>
										</div>
									</div>
								))
							)}
						</div>
					</Card>
				</div>
			</div>
		</div>
	);
}
