import { ArrowRight } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

const experiences = [
  {
    title: '编创音乐',
    description: '使用 AI 打造专属于你的乐曲！',
    image: '/assets/ui/home/experience-compose.png',
    path: '/compose',
  },
  {
    title: '交响乐舞台',
    description: '沉浸式体验交响的魅力！',
    image: '/assets/ui/home/experience-stage.png',
    path: '/stage',
  },
] as const;

export function ExperienceCarousel() {
  return (
    <section className="home-experiences" aria-labelledby="home-experiences-title">
      <div className="home-section-heading">
        <div>
          <h2 id="home-experiences-title">Experiences</h2>
          <p>推荐体验</p>
        </div>
        <Link className="home-section-heading__arrow" to="/stage" aria-label="前往交响舞台">
          <ArrowRight size={19} weight="bold" />
        </Link>
      </div>
      <div className="home-experiences__rail" aria-label="推荐体验">
        {experiences.map((experience) => (
          <Link className="home-experience-card" to={experience.path} key={experience.path}>
            <img src={experience.image} alt="" width="293" height="223" />
            <span className="sr-only">{experience.title}：{experience.description}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
