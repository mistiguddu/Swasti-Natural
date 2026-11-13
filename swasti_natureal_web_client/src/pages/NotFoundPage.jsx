import { Compass, ShieldX } from 'lucide-react';
import { LinkButton } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Card } from '../components/ui/Card.jsx';

export default function NotFoundPage({ forbidden = false }) {
  return (
    <Card className="mt-6">
      <EmptyState
        icon={forbidden ? ShieldX : Compass}
        title={forbidden ? 'You don’t have access to this page' : 'Page not found'}
        message={forbidden ? 'Your role doesn’t include the permission this page needs.' : 'The page you’re looking for doesn’t exist or was moved.'}
        action={<LinkButton to="/">Back to dashboard</LinkButton>}
      />
    </Card>
  );
}
