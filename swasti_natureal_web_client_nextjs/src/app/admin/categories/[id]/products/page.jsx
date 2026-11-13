import { ParamAlias } from '@/router';
import { Guard } from '@/shells/AdminShell.jsx';
import ProductListPage from '@/views/products/ProductListPage.jsx';

export default function Page() {
  return <Guard permission="catalog.manage"><ParamAlias map={{ categoryId: 'id' }}><ProductListPage /></ParamAlias></Guard>;
}
