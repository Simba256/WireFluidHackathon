import { PlayDispatch } from "./play-dispatch";

interface Props {
  searchParams: Promise<{ matchId?: string }>;
}

export default async function PlayPage({ searchParams }: Props) {
  const { matchId: matchIdParam } = await searchParams;
  const matchId =
    matchIdParam && /^\d+$/.test(matchIdParam) ? Number(matchIdParam) : null;
  return <PlayDispatch matchId={matchId} />;
}
