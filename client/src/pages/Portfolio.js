import React, { useState, useEffect } from 'react';
import { ExternalLink, Calendar, Globe, Award } from 'lucide-react';
import api from '../api';
import './Portfolio.css';

const categories = [
  { value: '', label: 'All Projects' },
  { value: 'web-hosting', label: 'Web Hosting' },
  { value: 'app-development', label: 'App Development' },
  { value: 'workflow-solutions', label: 'Workflow Solutions' },
  { value: 'website-design', label: 'Website Design' }
];

const getFaviconUrl = (url) => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch { return null; }
};

const Portfolio = () => {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = filter ? `?category=${filter}` : '';
    api.get(`/portfolio${params}`).then(res => { setItems(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filter]);

  return (
    <div className="portfolio-page">
      <section className="page-hero">
        <div className="container">
          <h1>Our Work</h1>
          <p>Apps and systems we've built for businesses across Australia</p>
        </div>
      </section>

      <section className="container" style={{ padding: '2rem 1.5rem' }}>
        <div className="portfolio-filters">
          {categories.map(cat => (
            <button
              key={cat.value}
              className={`filter-btn ${filter === cat.value ? 'active' : ''}`}
              onClick={() => setFilter(cat.value)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="page-loading">Loading portfolio...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <h3>Portfolio Coming Soon</h3>
            <p>We're preparing our showcase. Check back soon to see our latest projects!</p>
          </div>
        ) : (
          <div className="portfolio-grid">
            {items.map((item, idx) => {
              const logoSrc = item.appLogoUrl || (item.appUrl ? getFaviconUrl(item.appUrl) : null);
              return (
                <div key={idx} className="portfolio-card card fade-in">
                  {item.images && item.images[0] && (
                    <div className="pc-image">
                      <img src={item.images[0].url} alt={item.title} />
                    </div>
                  )}
                  <div className="pc-body">
                    <div className="pc-meta">
                      <span className="badge badge-info">{item.category?.replace(/-/g, ' ')}</span>
                      {item.completedDate && (
                        <span className="pc-date"><Calendar size={12} /> {new Date(item.completedDate).toLocaleDateString()}</span>
                      )}
                    </div>
                    <div className="pc-title-row">
                      {logoSrc && (
                        <img src={logoSrc} alt="" className="pc-app-logo" onError={e => e.target.style.display='none'} />
                      )}
                      <div>
                        <h3>{item.title}</h3>
                        {item.client && <p className="pc-client">{item.client}</p>}
                      </div>
                    </div>
                    <p className="pc-desc">{item.description}</p>
                    {item.technologies && item.technologies.length > 0 && (
                      <div className="pc-tech">
                        {item.technologies.map((t, i) => <span key={i} className="tech-tag">{t}</span>)}
                      </div>
                    )}
                    <div className="pc-links">
                      {item.appUrl && (
                        <a href={item.appUrl} target="_blank" rel="noopener noreferrer" className="pc-link pc-link-app">
                          <Globe size={14} /> Visit App
                        </a>
                      )}
                      {item.liveUrl && (
                        <a href={item.liveUrl} target="_blank" rel="noopener noreferrer" className="pc-link">
                          View Live <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                    {item.testimonial && item.testimonial.quote && (
                      <blockquote className="pc-testimonial">
                        <p>"{item.testimonial.quote}"</p>
                        <cite>- {item.testimonial.author}{item.testimonial.role ? `, ${item.testimonial.role}` : ''}</cite>
                      </blockquote>
                    )}
                  </div>
                  <div className="pc-built-by">
                    <Award size={12} /> Built by Penny Wise I.T
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default Portfolio;
