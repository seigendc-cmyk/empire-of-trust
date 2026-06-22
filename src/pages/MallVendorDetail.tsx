import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { SponsoredBadge } from "../components/SponsoredBadge";
import { ErrorState, LoadingState } from "../components/States";
import { getVendor, listProductsByVendor, listVendorBranches, listVendorContacts, logCommerceInterest } from "../lib/mallRepository";
import type { EotProduct, EotVendor, EotVendorBranch, EotVendorContact } from "../types";

function whatsAppHref(number: string, message: string) {
  const clean = number.replace(/[^\d+]/g, "");
  return clean ? `https://wa.me/${clean.replace(/^\+/, "")}?text=${encodeURIComponent(message)}` : "";
}

export default function MallVendorDetail() {
  const { vendorId = "" } = useParams();
  const [vendor, setVendor] = useState<EotVendor | null>(null);
  const [products, setProducts] = useState<EotProduct[]>([]);
  const [branches, setBranches] = useState<EotVendorBranch[]>([]);
  const [contacts, setContacts] = useState<EotVendorContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getVendor(vendorId), listProductsByVendor(vendorId), listVendorBranches(vendorId), listVendorContacts(vendorId)])
      .then(([vendorRow, productRows, branchRows, contactRows]) => {
        setVendor(vendorRow ?? null);
        setProducts(productRows);
        setBranches(branchRows);
        setContacts(contactRows);
      })
      .finally(() => setLoading(false));
    logCommerceInterest("vendor_viewed", { vendorId }).catch(() => undefined);
  }, [vendorId]);

  if (loading) return <LoadingState label="Loading storefront..." />;
  if (!vendor) return <ErrorState title="Vendor not found" message="This storefront is not available from Firestore or local vendor packs." />;

  const whatsapp = whatsAppHref(vendor.whatsapp || vendor.phone, `Hello ${vendor.businessName}, I found your storefront in iTred Mall.`);

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Vendor Storefront" title={vendor.businessName} subtitle={`${vendor.sector || "Commercial vendor"} / ${vendor.city || "City pending"}`} actions={[{ label: "Products", to: `/mall/search?query=${encodeURIComponent(vendor.businessName)}` }]} />
      <div className="flex flex-wrap gap-2">
        <SponsoredBadge label="Verified" />
        <SponsoredBadge label="Premium Partner" />
      </div>

      <section className="panel overflow-hidden">
        <div className="h-40 border-b border-white/10 bg-black/30 sm:h-56">
          {vendor.bannerUrl ? <img className="h-full w-full object-cover" src={vendor.bannerUrl} alt="" /> : <div className="grid h-full place-items-center text-xl font-black text-signal">ITRED MALL</div>}
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-[112px_1fr]">
          <div className="h-24 border border-white/10 bg-black/50">
            {vendor.logoUrl ? <img className="h-full w-full object-cover" src={vendor.logoUrl} alt="" /> : <div className="grid h-full place-items-center text-xs font-black text-signal">LOGO</div>}
          </div>
          <div className="grid gap-3">
            <p className="text-sm leading-6 text-paper/70">{vendor.description}</p>
            <div className="grid gap-2 text-sm text-paper/60 sm:grid-cols-2">
              <p><span className="font-bold text-paper">Address:</span> {vendor.address || `${vendor.suburb}, ${vendor.city}`}</p>
              <p><span className="font-bold text-paper">Status:</span> {vendor.status || "listed"}</p>
            </div>
            <div className="grid gap-2 sm:flex">
              {whatsapp && <a className="btn btn-primary" href={whatsapp} target="_blank" rel="noreferrer" onClick={() => logCommerceInterest("whatsapp_clicked", { vendorId: vendor.id }).catch(() => undefined)}>WhatsApp</a>}
              {vendor.phone && <a className="btn" href={`tel:${vendor.phone}`} onClick={() => logCommerceInterest("call_clicked", { vendorId: vendor.id }).catch(() => undefined)}>Call</a>}
              {vendor.website && <a className="btn" href={vendor.website} target="_blank" rel="noreferrer">Website</a>}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="panel p-4">
          <h2 className="text-xl font-black">Branches</h2>
          <div className="mt-3 grid gap-2">
            {branches.map((branch) => (
              <div key={branch.id} className="border border-white/10 bg-black/20 p-3 text-sm text-paper/65">
                <p className="font-bold text-paper">{branch.name}</p>
                <p>{branch.address || `${branch.suburb}, ${branch.city}`}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="panel p-4">
          <h2 className="text-xl font-black">Contacts</h2>
          <div className="mt-3 grid gap-2">
            {contacts.map((contact) => (
              <div key={contact.id} className="border border-white/10 bg-black/20 p-3 text-sm text-paper/65">
                <p className="font-bold text-paper">{contact.label}</p>
                {contact.phone && <p>Phone: {contact.phone}</p>}
                {contact.email && <p>Email: {contact.email}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel divide-y divide-white/10">
        <div className="p-4">
          <h2 className="text-xl font-black">Products</h2>
        </div>
        {products.length === 0 ? <p className="p-4 text-sm text-paper/60">No products are cached for this storefront yet.</p> : products.map((product) => (
          <Link key={product.id} to={`/mall/products/${product.id}`} className="grid gap-3 p-4 hover:bg-white/5 sm:grid-cols-[88px_1fr]">
            <div className="h-20 border border-white/10 bg-black/30">
              {product.imageUrl ? <img className="h-full w-full object-cover" src={product.imageUrl} alt="" /> : <div className="grid h-full place-items-center text-xs font-black text-signal">ITEM</div>}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{product.category}</p>
              <h3 className="mt-1 text-lg font-black">{product.name}</h3>
              <p className="mt-1 text-sm text-paper/60">{product.currency} {Number(product.price || 0).toFixed(2)} / {product.stockStatus || product.availability}</p>
            </div>
          </Link>
        ))}
      </section>
    </section>
  );
}
