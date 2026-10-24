import { useParams } from 'react-router-dom';
import { useApp } from '../auth/AppProvider';

/** The kid from the `:kidId` route param, or undefined while loading/missing. */
export function useKid() {
  const { kidId } = useParams();
  const { kids } = useApp();
  return kids.find((k) => k.id === kidId);
}
