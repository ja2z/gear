import { useParams, useSearchParams } from 'react-router-dom';
import CategoryItemsPanel from '../components/CategoryItemsPanel';

const Items = () => {
  const { category } = useParams();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'checkout';

  if (!category) {
    return null;
  }

  return <CategoryItemsPanel category={category} mode={mode} variant="page" />;
};

export default Items;
