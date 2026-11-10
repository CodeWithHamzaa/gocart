import HeroSlider from './HeroSlider'
import HeroShortcuts from './HeroShortcuts'

// M40: the hero is in the initial HTML (the slider is a client component, but every slide is
// server-rendered). M101 (ADR-047): the owner's chosen hero: the banner slider ("C" mockup, slides from
// lib/hero-slides.ts, real data only), then the category shortcuts.
const Hero = ({ slides = [], categories = [] }) => (
    <section className='mx-4 sm:mx-6'>
        <div className='mx-auto mt-3 max-w-7xl sm:mt-6'>
            <HeroSlider slides={slides} />
            <HeroShortcuts categories={categories} />
        </div>
    </section>
)

export default Hero
