import ProductsPage from '@/store/pages/ProductsPage.jsx';

/**
 * Shared by /products and /category/[slug]. Keeping the listing in a layout means switching
 * category, filter, sort or page never remounts it: no skeleton flash, no layout jump, no
 * scroll reset — only the product grid updates. The pages themselves render nothing.
 */
export default function CatalogLayout({ children }) {
  return (
    <>
      <ProductsPage />
      {children}
    </>
  );
}
