import { Metadata } from 'next';
import { ContactPage } from './ContactPage';

export const metadata: Metadata = {
  title: 'Contato | NEW SYSTEM DISTRIBUIDORA',
  description: 'Entre em contato com a NEW SYSTEM DISTRIBUIDORA. WhatsApp, Instagram e email para atendimento.',
  alternates: {
    canonical: '/contato',
  },
};

export default function Contact() {
  return <ContactPage />;
}