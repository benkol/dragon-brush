import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { loadRepo } from '../data';
import { reportError, setErrorSink } from '../errors';
import type { Repo } from '../data/repo';
import type { AppUser, CustomReward, Family, Kid } from '../data/types';

interface AppState {
  repo: Repo;
  user: AppUser | null;
  familyId: string | null;
  family: Family | null;
  kids: Kid[];
  kidsReady: boolean;
  rewards: CustomReward[];
  /** Re-reads which family this parent belongs to (after joining or leaving). */
  refreshFamily: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const { t } = useTranslation();
  const [repo, setRepo] = useState<Repo | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [familyError, setFamilyError] = useState(false);
  const [resolveCount, setResolveCount] = useState(0);
  const [family, setFamily] = useState<Family | null>(null);
  const [kids, setKids] = useState<Kid[]>([]);
  const [kidsReady, setKidsReady] = useState(false);
  const [rewards, setRewards] = useState<CustomReward[]>([]);

  const refreshFamily = useCallback(() => setResolveCount((n) => n + 1), []);

  useEffect(() => {
    loadRepo().then(setRepo);
  }, []);

  useEffect(() => {
    if (!repo) return;
    return repo.onAuth((u) => {
      setUser(u);
      setAuthReady(true);
    });
  }, [repo]);

  // Error reports can be sent once a parent is signed in.
  useEffect(() => {
    if (!repo || !user) return;
    setErrorSink((r) => repo.reportError(r));
    return () => setErrorSink(null);
  }, [repo, user?.uid]);

  // Which family does this parent belong to?
  useEffect(() => {
    setFamilyId(null);
    setFamilyError(false);
    if (!repo || !user) return;
    let cancelled = false;
    repo
      .resolveFamily(user)
      .then((fid) => !cancelled && setFamilyId(fid))
      .catch((e) => {
        reportError(e, 'family-resolve');
        if (!cancelled) setFamilyError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [repo, user?.uid, resolveCount]);

  // Watch the family; if another parent removes us, move to our own family.
  useEffect(() => {
    setFamily(null);
    if (!repo || !user || !familyId) return;
    return repo.watchFamily(familyId, (f) => {
      if (!f || !f.members.includes(user.uid)) refreshFamily();
      else setFamily(f);
    });
  }, [repo, user?.uid, familyId, refreshFamily]);

  useEffect(() => {
    setKids([]);
    setKidsReady(false);
    setRewards([]);
    if (!repo || !familyId) return;
    const offKids = repo.watchKids(familyId, (k) => {
      setKids(k);
      setKidsReady(true);
    });
    const offRewards = repo.watchRewards(familyId, setRewards);
    return () => {
      offKids();
      offRewards();
    };
  }, [repo, familyId]);

  if (!repo || !authReady) return <>{fallback}</>;
  if (user && familyError) {
    return (
      <div className="splash">
        <div className="card stack center">
          <p>{t('common.error')}</p>
          <button className="btn btn-primary" onClick={refreshFamily}>
            {t('brush.tryAgain')}
          </button>
        </div>
      </div>
    );
  }
  if (user && !familyId) return <>{fallback}</>;
  return <Ctx.Provider value={{ repo, user, familyId, family, kids, kidsReady, rewards, refreshFamily }}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}

/** The signed-in parent's family id; screens using it are only rendered when signed in. */
export function useFamilyId() {
  const { familyId } = useApp();
  return familyId!;
}
