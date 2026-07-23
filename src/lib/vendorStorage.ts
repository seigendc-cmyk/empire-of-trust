import { VendorProfile, VendorProduct } from '../types';

const VENDOR_PROFILE_KEY = 'o_publish_vendor_profile_v1';
const VENDOR_PRODUCTS_KEY = 'o_publish_vendor_products_v1';

export const DEFAULT_VENDOR_PROFILE: VendorProfile = {
  id: 'vendor_safari_corner',
  businessName: "AfriCraft Children's Bookstore & Stationers",
  ownerName: "Tendai Moyo",
  phone: "+263774479121",
  email: "sales@africraftbooks.co.zw",
  address: "Shop 14, Heritage Square, Harare, Zimbabwe",
  logoUrl: "https://images.unsplash.com/photo-1535551951406-a19828b0a76b?auto=format&fit=crop&w=400&q=80",
  description: "Specializing in children's illustrated storybooks, cartoon learning workbooks, character plush toys, and educational stationery kits across Southern Africa.",
  category: "Children's Books & Educational Crafts",
  tagline: "Inspiring Young Minds with Colourful African Cartoons & Stories",
  currency: "USD",
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_VENDOR_PRODUCTS: VendorProduct[] = [
  {
    id: 'prod_1',
    vendorId: 'vendor_safari_corner',
    vendorBusinessName: "AfriCraft Children's Bookstore & Stationers",
    vendorPhone: "+263774479121",
    title: "Max the Teddy Bear: Magical Forest Adventure Box Set",
    description: "Hardcover 3D illustrated children storybook with 12 cartoon art plates, bonus activity coloring book, and plush teddy bear bookmark.",
    price: 18.50,
    currency: "USD",
    category: "Children's Hardcover Books",
    imageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80",
    badge: "Featured Best Seller",
    whatsappMsgTemplate: "Hi AfriCraft, I am interested in purchasing the 'Max the Teddy Bear Box Set' ($18.50) from your Book Store storefront. Please confirm stock and delivery.",
    inStock: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_2',
    vendorId: 'vendor_safari_corner',
    vendorBusinessName: "AfriCraft Children's Bookstore & Stationers",
    vendorPhone: "+263774479121",
    title: "Barnaby Owl Cartoon Math & Phonics Workbook (Grade 1-3)",
    description: "Interactive workbook packed with 50+ numbered cartoon illustrations, step-by-step logic puzzles, and QR code video lessons.",
    price: 12.00,
    currency: "USD",
    category: "Educational Workbooks",
    imageUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=800&q=80",
    badge: "Hot Deal - 15% OFF",
    whatsappMsgTemplate: "Hello, I want to order 'Barnaby Owl Cartoon Math Workbook' ($12.00). Please provide WhatsApp payment details.",
    inStock: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_3',
    vendorId: 'vendor_safari_corner',
    vendorBusinessName: "AfriCraft Children's Bookstore & Stationers",
    vendorPhone: "+263774479121",
    title: "Whimsical Watercolor Storyteller Sketchbook & Crayon Set",
    description: "Premium eco-friendly watercolor paper sketchbook featuring pre-printed cartoon outlines for young artists and 24 non-toxic wax crayons.",
    price: 9.99,
    currency: "USD",
    category: "Crafts & Art Supplies",
    imageUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80",
    badge: "New Arrival",
    whatsappMsgTemplate: "Greetings! I would like to inquire about the 'Storyteller Sketchbook & Crayon Set' ($9.99). Is local pickup available?",
    inStock: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_4',
    vendorId: 'vendor_safari_corner',
    vendorBusinessName: "AfriCraft Children's Bookstore & Stationers",
    vendorPhone: "+263774479121",
    title: "Chibi Kawaii Animals Reading Lamp & Nightlight",
    description: "Rechargeable soft silicone animal nightlight for bedtime story reading with 3 warm dimmable brightness levels.",
    price: 15.00,
    currency: "USD",
    category: "Reading Accessories",
    imageUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80",
    badge: "Popular Gift",
    whatsappMsgTemplate: "Hi AfriCraft! I would like to order the 'Chibi Kawaii Animals Reading Lamp' ($15.00) via WhatsApp.",
    inStock: true,
    createdAt: new Date().toISOString(),
  },
];

export function getVendorProfile(): VendorProfile {
  try {
    const raw = localStorage.getItem(VENDOR_PROFILE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Error reading vendor profile from storage:', err);
  }
  return DEFAULT_VENDOR_PROFILE;
}

export function saveVendorProfile(profile: VendorProfile): void {
  try {
    localStorage.setItem(VENDOR_PROFILE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error('Error saving vendor profile:', err);
  }
}

export function getVendorProducts(): VendorProduct[] {
  try {
    const raw = localStorage.getItem(VENDOR_PRODUCTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading vendor products from storage:', err);
  }
  return DEFAULT_VENDOR_PRODUCTS;
}

export function saveVendorProducts(products: VendorProduct[]): void {
  try {
    localStorage.setItem(VENDOR_PRODUCTS_KEY, JSON.stringify(products));
  } catch (err) {
    console.error('Error saving vendor products:', err);
  }
}

export function formatWhatsAppProductUrl(vendorPhone: string, productTitle: string, price: number, currency: string, customMsg?: string): string {
  // Clean phone number (strip spaces, dashes, ensure +)
  let cleanPhone = vendorPhone.replace(/[^0-[#9+]/g, '').replace(/[\s\-\(\)]/g, '');
  if (!cleanPhone.startsWith('+')) {
    cleanPhone = '+' + cleanPhone;
  }
  const cleanNum = cleanPhone.replace('+', '');

  const defaultText = customMsg?.trim() || `Hello! I am inquiring about the product "${productTitle}" priced at ${currency === 'USD' ? '$' : currency + ' '}${price.toFixed(2)} from your storefront on O-Publish Book Store. Please advise on stock and payment/delivery details.`;

  return `https://wa.me/${cleanNum}?text=${encodeURIComponent(defaultText)}`;
}
