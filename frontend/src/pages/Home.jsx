import { useNavigate } from 'react-router-dom';
import {
  User,
  Backpack,
  Calendar,
  Award,
  MapPin,
  ClipboardList,
} from 'lucide-react';
import HomeHeroCarousel from '../components/HomeHeroCarousel';
import { AnimateMain } from '../components/AnimateMain';

const Home = () => {
  const navigate = useNavigate();

  return (
    <>
      <div className="h-screen-small flex flex-col bg-gray-100">
        {/* Welcome banner — dashboard-style header: safe areas, clear hierarchy, soft depth */}
        <div className="relative z-10 shrink-0 overflow-hidden border-b border-white/15 bg-gradient-to-b from-[#234a9e] via-[#1E398A] to-[#122552] shadow-[0_4px_24px_-2px_rgba(0,0,0,0.2)]">
          {/* Top sheen + bottom hairline for separation from hero */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-white/[0.12] to-transparent"
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/25" aria-hidden />
          <div
            className="pointer-events-none absolute -right-8 top-0 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-6 bottom-0 h-32 w-32 rounded-full bg-amber-200/10 blur-3xl"
            aria-hidden
          />

          <div
            className="relative mx-auto flex w-full max-w-xl items-center justify-center gap-4 px-4 pb-4 pt-[max(0.875rem,env(safe-area-inset-top,0px))] sm:gap-6 sm:px-5 sm:pb-5"
          >
            <div className="shrink-0">
              <img
                src="/BSA_Logo.webp"
                alt="Scouts BSA"
                className="h-10 w-auto object-contain drop-shadow-md sm:h-11"
                width={88}
                height={44}
              />
            </div>

            <div className="min-w-0 flex-1 basis-0 text-center">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-white/70 sm:text-xs">
                Welcome
              </p>
              <h1 className="mt-1.5 text-[1.65rem] font-bold leading-none tracking-tight text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.15)] sm:text-3xl">
                Troop 222
              </h1>
            </div>

            <div className="relative shrink-0">
              <div
                className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-white/30 to-transparent opacity-60 blur-[1.5px]"
                aria-hidden
              />
              <div
                className="relative flex h-[3.5rem] w-[3.5rem] items-center justify-center rounded-full bg-gradient-to-b from-white/20 to-white/[0.07] shadow-inner ring-1 ring-white/25 ring-offset-2 ring-offset-[#1a3a7a] sm:h-[3.75rem] sm:w-[3.75rem]"
                aria-hidden
              >
                <User className="h-[1.65rem] w-[1.65rem] text-white/95 sm:h-8 sm:w-8" strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </div>

        <AnimateMain className="flex flex-1 flex-col min-h-0">
        <HomeHeroCarousel />

        {/* Module buttons */}
        <div className="shrink-0 bg-white px-4 pt-1.5 pb-5 space-y-2.5 sm:px-5 sm:pb-6 sm:space-y-3">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/gear')}
              className="flex-1 flex flex-col items-center justify-center gap-1.5 rounded-3xl py-5 touch-target bg-scout-blue text-white transition-all shadow-sm"
            >
              <Backpack className="h-6 w-6" />
              <span className="text-base font-bold">Gear</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/calendar')}
              className="flex-1 flex flex-col items-center justify-center gap-1.5 rounded-3xl py-5 touch-target bg-scout-green text-white transition-all shadow-sm"
            >
              <Calendar className="h-6 w-6" />
              <span className="text-base font-bold">Calendar</span>
            </button>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/advancement')}
              className="flex-1 flex flex-col items-center justify-center gap-1.5 rounded-3xl py-5 touch-target bg-scout-orange text-white transition-all shadow-sm"
            >
              <Award className="h-6 w-6" />
              <span className="text-base font-bold">Advancement</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/outings')}
              className="flex-1 flex flex-col items-center justify-center gap-1.5 rounded-3xl py-5 touch-target bg-slate-700 text-white transition-all shadow-sm"
            >
              <MapPin className="h-6 w-6" />
              <span className="text-base font-bold">Outings</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => navigate('/manage')}
            className="w-full flex flex-row items-center justify-center gap-2 rounded-2xl py-3.5 touch-target border-2 border-scout-red text-scout-red bg-transparent transition-all"
          >
            <ClipboardList className="h-5 w-5" />
            <span className="text-base font-bold">Manage</span>
          </button>
        </div>
        </AnimateMain>
      </div>
    </>
  );
};

export default Home;
