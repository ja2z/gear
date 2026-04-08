import { useParams, useSearchParams } from 'react-router-dom';
import CategoryItemsPanel from '../components/CategoryItemsPanel';
import { useDesktopHeader } from '../context/DesktopHeaderContext';

const Items = () => {
  const { category } = useParams();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'checkout';

  useDesktopHeader({ title: category || 'Items' });

  if (!category) {
    return null;
  }

  return <CategoryItemsPanel category={category} mode={mode} variant="page" />;
};

export default Items;
