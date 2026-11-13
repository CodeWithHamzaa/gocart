import HeroSlider from './HeroSlider'

// M40: the hero is in the initial HTML (the slider is a client component, but every slide is
// server-rendered). M101 (ADR-047): the banner slider (slides from lib/hero-slides.ts, real data only).
// M118: the category shortcuts that sat under it became the "Shop by category" section
// (components/CategoryShowcase.tsx), so the hero is the banner alone.
const Hero = ({ slides = [] }) => (
    <section className='mx-4 sm:mx-6'>
        <div className='mx-auto mt-3 max-w-7xl sm:mt-6'>
            <HeroSlider slides={slides} />
        </div>
    </section>
)

export default Hero
