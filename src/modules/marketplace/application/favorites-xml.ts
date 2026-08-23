import type { CanonicalMarketplaceProduct } from "../domain/types";

function escapeXml(value: string | number): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function buildFavoriteProductsXml(products: CanonicalMarketplaceProduct[]): string {
  const productXml = products
    .map(
      (product) => `  <Product id="${escapeXml(product.productId)}">
    <Title>${escapeXml(product.title)}</Title>
    <Slug>${escapeXml(product.slug)}</Slug>
    <Description>${escapeXml(product.description)}</Description>
    <ShortDescription>${escapeXml(product.shortDescription)}</ShortDescription>
    <Brand>${escapeXml(product.brand.name)}</Brand>
    <Category>${escapeXml(product.category.path)}</Category>
    <Supplier>${escapeXml(product.supplier.tradeName)}</Supplier>
    <VatRateBasisPoints>${escapeXml(product.vatRateBasisPoints)}</VatRateBasisPoints>
    <Images>${product.images.map((image) => `<Image>${escapeXml(image)}</Image>`).join("")}</Images>
    <Variants>${product.variants
      .map(
        (variant) =>
          `<Variant id="${escapeXml(variant.variantId)}"><Sku>${escapeXml(variant.sku)}</Sku><Barcode>${escapeXml(variant.barcode ?? "")}</Barcode><Title>${escapeXml(variant.title)}</Title><PriceMinor>${escapeXml(variant.priceMinor)}</PriceMinor><Currency>${escapeXml(variant.currency)}</Currency><Moq>${escapeXml(variant.moq)}</Moq><QuantityStep>${escapeXml(variant.quantityStep)}</QuantityStep><AvailableStock>${escapeXml(variant.availableStock)}</AvailableStock></Variant>`,
      )
      .join("")}</Variants>
  </Product>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Products>\n${productXml}\n</Products>\n`;
}
