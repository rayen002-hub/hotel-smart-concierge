import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ServiceCard {
  title: string;
  description: string;
  icon: string;
  path: string;
  gradient: string;
}

const services: ServiceCard[] = [
  {
    title: 'Envoyer une réclamation',
    description: 'Un problème dans votre chambre ? Signalez-le en quelques clics.',
    icon: '📝',
    path: '/room/complaint',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    title: 'Suivre mes réclamations',
    description: 'Consultez l\'état de vos demandes en temps réel.',
    icon: '📋',
    path: '/room/complaints',
    gradient: 'from-blue-500 to-indigo-500',
  },
  {
    title: 'Informations hôtel',
    description: 'Horaires, services, et tout ce qu\'il faut savoir.',
    icon: '🏨',
    path: '/room/hotel-info',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    title: 'Conversion devise',
    description: 'Consultez les taux de change en vigueur.',
    icon: '💱',
    path: '/room/currency',
    gradient: 'from-violet-500 to-purple-500',
  },
  {
    title: 'Messages réception',
    description: 'Contactez la réception et suivez vos échanges.',
    icon: '💬',
    path: '/room/messages',
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    title: 'Événements',
    description: 'Découvrez les événements à venir dans l\'hôtel.',
    icon: '🎉',
    path: '/room/events',
    gradient: 'from-amber-500 to-orange-500',
  },
];

export const RoomHomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex items-start justify-center px-4 py-8 md:py-12">
      <div className="w-full max-w-lg space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Bienvenue 👋</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Comment pouvons-nous vous aider aujourd'hui ?
          </p>
        </div>

        {/* Service cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {services.map((service) => (
            <button
              key={service.path}
              onClick={() => navigate(service.path)}
              className="group relative rounded-xl border bg-[hsl(var(--card))] p-5 text-left shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
            >
              {/* Icon */}
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${service.gradient} text-white text-xl shadow-md mb-3`}>
                {service.icon}
              </div>

              {/* Text */}
              <h2 className="text-sm font-semibold mb-1 group-hover:text-[hsl(var(--primary))] transition-colors">
                {service.title}
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                {service.description}
              </p>

              {/* Arrow */}
              <span className="absolute top-5 right-4 text-[hsl(var(--muted-foreground))] opacity-0 group-hover:opacity-100 transition-opacity text-sm">
                →
              </span>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">
          Besoin d'assistance immédiate ? Appelez la réception au <span className="font-semibold">0</span> depuis votre chambre.
        </p>

      </div>
    </div>
  );
};
