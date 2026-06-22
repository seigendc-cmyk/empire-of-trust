import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/States";
import { getProduct, getVendor, mallCategoryExamples, productAvailability, productInputFromForm, upsertProduct, upsertVendor, vendorInputFromForm, vendorStatuses } from "../lib/mallRepository";
import type { EotProduct, EotVendor } from "../types";

export default function StudioCommerceForm({ kind }: { kind: "vendor" | "product" }) {
  const { vendorId, productId } = useParams();
  const id = kind === "vendor" ? vendorId : productId;
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<EotVendor | null>(null);
  const [product, setProduct] = useState<EotProduct | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    (kind === "vendor" ? getVendor(id).then(setVendor) : getProduct(id).then(setProduct)).finally(() => setLoading(false));
  }, [id, kind]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      const savedId = kind === "vendor" ? await upsertVendor(vendorInputFromForm(form, id)) : await upsertProduct(productInputFromForm(form, id));
      navigate(kind === "vendor" ? `/studio/commerce/vendors/${savedId}/edit` : `/studio/commerce/products/${savedId}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Commerce record could not be saved.");
    }
  }

  if (loading) return <LoadingState label="Loading commerce record..." />;
  if (id && kind === "vendor" && !vendor) return <ErrorState title="Vendor not found" />;
  if (id && kind === "product" && !product) return <ErrorState title="Product not found" />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Commerce" title={kind === "vendor" ? "Vendor record" : "Product record"} subtitle="Firestore source of truth with offline cache support." actions={[{ label: "Commerce", to: "/studio/commerce" }]} />
      <form className="panel grid gap-4 p-4" onSubmit={submit}>
        {error && <p className="border border-ember bg-ember/10 p-3 text-sm font-bold text-ember">{error}</p>}
        {kind === "vendor" ? <VendorFields vendor={vendor} /> : <ProductFields product={product} />}
        <button className="btn btn-primary w-full sm:w-fit">Save {kind}</button>
      </form>
    </section>
  );
}

function VendorFields({ vendor }: { vendor: EotVendor | null }) {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-3">
        <Field name="vendorCode" label="Vendor code" value={vendor?.vendorCode} />
        <Field name="businessId" label="Story business ID" value={vendor?.businessId} />
        <label className="grid gap-1 text-sm font-bold">Status<select className="field" name="status" defaultValue={vendor?.status || "active"}>{vendorStatuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field name="businessName" label="Business name" value={vendor?.businessName} required />
        <Field name="tradingName" label="Trading name" value={vendor?.tradingName} />
        <Field name="sector" label="Sector" value={vendor?.sector} />
        <Field name="category" label="Category" value={vendor?.category} />
      </div>
      <Area name="description" label="Description" value={vendor?.description} />
      <div className="grid gap-3 md:grid-cols-2">
        <Field name="logoUrl" label="Logo URL" value={vendor?.logoUrl} />
        <Field name="bannerUrl" label="Banner URL" value={vendor?.bannerUrl} />
        <Field name="phone" label="Phone" value={vendor?.phone} />
        <Field name="whatsapp" label="WhatsApp" value={vendor?.whatsapp} />
        <Field name="email" label="Email" value={vendor?.email} />
        <Field name="website" label="Website" value={vendor?.website} />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Field name="country" label="Country" value={vendor?.country} />
        <Field name="city" label="City" value={vendor?.city} />
        <Field name="district" label="District" value={vendor?.district} />
        <Field name="suburb" label="Suburb" value={vendor?.suburb} />
        <Field name="address" label="Address" value={vendor?.address} />
      </div>
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="isStoryLinked" defaultChecked={vendor?.isStoryLinked} /> Story linked</label>
      <div className="grid gap-3 md:grid-cols-2">
        <Area name="linkedCharacterIds" label="Linked character IDs" value={(vendor?.linkedCharacterIds ?? []).join("\n")} />
        <Area name="linkedBusinessIds" label="Linked business IDs" value={(vendor?.linkedBusinessIds ?? []).join("\n")} />
      </div>
    </>
  );
}

function ProductFields({ product }: { product: EotProduct | null }) {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-3">
        <Field name="productCode" label="Product code" value={product?.productCode} />
        <Field name="vendorId" label="Vendor ID" value={product?.vendorId} required />
        <label className="grid gap-1 text-sm font-bold">Availability<select className="field" name="availability" defaultValue={product?.availability || "unknown"}>{productAvailability.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field name="name" label="Product name" value={product?.name} required />
        <Field name="brand" label="Brand" value={product?.brand} />
        <label className="grid gap-1 text-sm font-bold">Category<select className="field" name="category" defaultValue={product?.category || "General Dealers"}>{mallCategoryExamples.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <Field name="subcategory" label="Subcategory" value={product?.subcategory} />
      </div>
      <Area name="description" label="Description" value={product?.description} />
      <div className="grid gap-3 md:grid-cols-4">
        <Field name="price" label="Price" value={String(product?.price ?? 0)} type="number" />
        <Field name="currency" label="Currency" value={product?.currency || "USD"} />
        <Field name="unit" label="Unit" value={product?.unit} />
        <Field name="stockStatus" label="Stock status" value={product?.stockStatus} />
      </div>
      <Field name="imageUrl" label="Image URL" value={product?.imageUrl} />
      <Area name="galleryUrls" label="Gallery URLs" value={(product?.galleryUrls ?? []).join("\n")} />
      <Area name="tags" label="Tags" value={(product?.tags ?? []).join(", ")} />
      <div className="grid gap-3 md:grid-cols-3">
        <Area name="linkedEpisodeIds" label="Linked episode IDs" value={(product?.linkedEpisodeIds ?? []).join("\n")} />
        <Area name="linkedCharacterIds" label="Linked character IDs" value={(product?.linkedCharacterIds ?? []).join("\n")} />
        <Area name="linkedBusinessIds" label="Linked business IDs" value={(product?.linkedBusinessIds ?? []).join("\n")} />
      </div>
    </>
  );
}

function Field({ name, label, value, required, type = "text" }: { name: string; label: string; value?: string; required?: boolean; type?: string }) {
  return <label className="grid gap-1 text-sm font-bold">{label}<input className="field" name={name} type={type} defaultValue={value} required={required} /></label>;
}

function Area({ name, label, value }: { name: string; label: string; value?: string }) {
  return <label className="grid gap-1 text-sm font-bold">{label}<textarea className="field min-h-24" name={name} defaultValue={value} /></label>;
}
