import { Guard } from '@/shells/AdminShell.jsx';
import ReviewsPage from '@/views/ReviewsPage.jsx';

export default function Page() {
  return <Guard permission="reviews.manage"><ReviewsPage /></Guard>;
}
