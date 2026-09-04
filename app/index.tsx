import { Redirect } from 'expo-router';
import { useAuth } from '../src/features/auth/useAuth';
import { getInitialRoute } from '../src/features/auth/navigation';

export default function Index() {
  const { loading, session, profile } = useAuth();

  if (loading) return null;

  return <Redirect href={getInitialRoute(session, profile)} />;
}
