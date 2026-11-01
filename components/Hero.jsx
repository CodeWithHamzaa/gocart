import HeroSlider from './HeroSlider'
import HeroShortcuts from './HeroShortcuts'

// M40: the hero is in the initial HTML (the slider is a client component, but every slide is
// server-rendered). M101 (ADR-047): the owner's chosen hero: the banner slider ("C" mockup, slides from
// lib/hero-slides.ts, real data only), then the category shortcuts and the three promises ("B" mockup).
const Hero = ({ slides = [], categories = [], shipping = {} }) => (
    <section className='mx-4 sm:mx-6'>
        <div className='mx-auto mt-4 max-w-7xl sm:mt-6'>
            <HeroSlider slides={slides} />
            <HeroShortcuts categories={categories} shipping={shipping} />
        </div>
    </section>
)

export default Hero
