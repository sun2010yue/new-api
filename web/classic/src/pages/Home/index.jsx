/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useContext, useEffect, useState, useRef } from 'react';
import { Button, ScrollList, ScrollItem } from '@douyinfe/semi-ui';
import { API, showError, copy, showSuccess, getSystemName } from '../../helpers';
import { useIsMobile } from '../../hooks/common/useIsMobile';
import { API_ENDPOINTS } from '../../constants/common.constant';
import { StatusContext } from '../../context/Status';
import { useActualTheme } from '../../context/Theme';
import { marked } from 'marked';
import { useTranslation } from 'react-i18next';
import { IconCopy } from '@douyinfe/semi-icons';
import { Link } from 'react-router-dom';
import NoticeModal from '../../components/layout/NoticeModal';
import {
  Moonshot,
  OpenAI,
  XAI,
  Zhipu,
  Volcengine,
  Cohere,
  Claude,
  Gemini,
  Suno,
  Minimax,
  Wenxin,
  Spark,
  Qingyan,
  DeepSeek,
  Qwen,
  Midjourney,
  Grok,
  AzureAI,
  Hunyuan,
  Xinference,
} from '@lobehub/icons';

const providerGroups = [
  [Moonshot, OpenAI, XAI, Zhipu, Volcengine, Cohere, Claude, Gemini, Suno],
  [Minimax, Wenxin, Spark, Qingyan, DeepSeek, Qwen, Midjourney, Grok, AzureAI, Hunyuan, Xinference],
];

const Home = () => {
  const { t, i18n } = useTranslation();

  const pricingData = [
    {
      name: 'GPT-4o',
      provider: 'OpenAI',
      iconGradient: 'linear-gradient(135deg, #4ade80, #059669)',
      inputStrike: '$5.00',
      inputPrice: '$3.00',
      outputStrike: '$15.00',
      outputPrice: '$9.00',
      savings: '40%',
    },
    {
      name: 'Claude 3.5 Sonnet',
      provider: 'Anthropic',
      iconGradient: 'linear-gradient(135deg, #fb923c, #d97706)',
      inputStrike: '$3.00',
      inputPrice: '$1.95',
      outputStrike: '$15.00',
      outputPrice: '$9.75',
      savings: '35%',
    },
    {
      name: 'Qwen3-Max',
      provider: t('通义千问'),
      iconGradient: 'linear-gradient(135deg, #60a5fa, #2563eb)',
      inputStrike: '$2.00',
      inputPrice: '$1.00',
      outputStrike: '$6.00',
      outputPrice: '$3.00',
      savings: '50%',
    },
    {
      name: 'DeepSeek V3',
      provider: 'DeepSeek',
      iconGradient: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
      inputStrike: '$0.80',
      inputPrice: '$0.32',
      outputStrike: '$2.40',
      outputPrice: '$0.96',
      savings: '60%',
    },
  ];

  const reviews = [
    { quote: t('用了 ' + getSystemName() + ' 之后，我们的 AI 成本直接降低了 45%，服务还特别稳定，太赞了！'), name: t('张工程师'), title: t('某科技公司'), bg: '#3b82f6' },
    { quote: t('一个API调用所有模型，开发效率提升了好几倍，价格还这么便宜！'), name: t('李产品'), title: t('某创业公司'), bg: '#8b5cf6' },
    { quote: t('企业级可用性保障，我们的业务再也没因为AI服务掉过链子！'), name: t('王架构师'), title: t('某大厂'), bg: '#10b981' },
  ];

  const services = ['Claude Opus 4.7', 'Claude Sonnet 4.6', 'GPT-5.4', 'GPT-4o-mini', 'Gemini 3.1 pro', 'Doubao Seedance 2.0', 'Qwen3.6-Max', 'DeepSeek V3.2'];
  const [statusState] = useContext(StatusContext);
  const actualTheme = useActualTheme();
  const [homePageContentLoaded, setHomePageContentLoaded] = useState(false);
  const [homePageContent, setHomePageContent] = useState('');
  const [noticeVisible, setNoticeVisible] = useState(false);
  const isMobile = useIsMobile();
  const isDemoSiteMode = statusState?.status?.demo_site_enabled || false;
  const docsLink = statusState?.status?.docs_link || '';
  const serverAddress = statusState?.status?.server_address || `${window.location.origin}`;
  const endpointItems = API_ENDPOINTS.map((e) => ({ value: e }));
  const [endpointIndex, setEndpointIndex] = useState(0);
  const heroRef = useRef(null);

  const displayHomePageContent = async () => {
    setHomePageContent(localStorage.getItem('home_page_content') || '');
    const res = await API.get('/api/home_page_content');
    const { success, message, data } = res.data;
    if (success) {
      let content = data;
      if (!data.startsWith('https://')) {
        content = marked.parse(data);
      }
      setHomePageContent(content);
      localStorage.setItem('home_page_content', content);

      if (data.startsWith('https://')) {
        const iframe = document.querySelector('iframe');
        if (iframe) {
          iframe.onload = () => {
            iframe.contentWindow.postMessage({ themeMode: actualTheme }, '*');
            iframe.contentWindow.postMessage({ lang: i18n.language }, '*');
          };
        }
      }
    } else {
      showError(message);
      setHomePageContent(t('加载首页内容失败...'));
    }
    setHomePageContentLoaded(true);
  };

  const handleCopyBaseURL = async () => {
    const ok = await copy(serverAddress);
    if (ok) {
      showSuccess(t('已复制到剪切板'));
    }
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    const checkNoticeAndShow = async () => {
      const lastCloseDate = localStorage.getItem('notice_close_date');
      const today = new Date().toDateString();
      if (lastCloseDate !== today) {
        try {
          const res = await API.get('/api/notice');
          const { success, data } = res.data;
          if (success && data && data.trim() !== '') {
            setNoticeVisible(true);
          }
        } catch (error) {
          console.error(t('获取公告失败:'), error);
        }
      }
    };
    checkNoticeAndShow();
  }, [t]);

  useEffect(() => {
    displayHomePageContent().then();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setInterval(() => {
      setEndpointIndex((prev) => (prev + 1) % endpointItems.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [endpointItems.length]);

  const renderNav = () => (
    <nav className='fixed top-0 left-0 right-0 z-50 home-nav-backdrop border-b border-semi-color-border'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between items-center h-16'>
          <div className='flex items-center'>
            <div
              className='w-10 h-10 rounded-xl flex items-center justify-center'
              style={{ background: 'linear-gradient(135deg, #1e40af, #7c3aed, #db2777)' }}
            >
              <i className='ri-robot-2-line home-text-white text-2xl'></i>
            </div>
            <span className='ml-3 text-xl font-bold text-semi-color-text-0'>{getSystemName()}</span>
          </div>
          <div className='hidden md:flex items-center space-x-8'>
            <button
              onClick={() => scrollToSection('features')}
              className='text-semi-color-text-1 hover:text-semi-color-text-0 font-medium transition-colors'
            >
              {t('产品特性')}
            </button>
            <button
              onClick={() => scrollToSection('models')}
              className='text-semi-color-text-1 hover:text-semi-color-text-0 font-medium transition-colors'
            >
              {t('模型广场')}
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className='text-semi-color-text-1 hover:text-semi-color-text-0 font-medium transition-colors'
            >
              {t('价格对比')}
            </button>
          </div>
          <div className='flex items-center space-x-4'>
            <Link to='/login'>
              <Button className='!rounded-xl font-medium'>{t('登录')}</Button>
            </Link>
            <Link to='/register'>
              <Button
                theme='solid'
                type='primary'
                className='!rounded-xl font-medium'
                style={{
                  background: 'linear-gradient(135deg, #1e40af, #7c3aed, #db2777)',
                }}
              >
                {t('立即开始')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );

  const renderHero = () => (
    <section ref={heroRef} className='home-hero-gradient pt-32 pb-24 relative overflow-hidden'>
      <div className='absolute inset-0 opacity-20' style={{ pointerEvents: 'none' }}>
        <div
          className='absolute top-20 left-20 w-72 h-72 rounded-full'
          style={{
            background: '#3b82f6',
            filter: 'blur(120px)',
          }}
        />
        <div
          className='absolute bottom-20 right-20 w-96 h-96 rounded-full'
          style={{
            background: '#8b5cf6',
            filter: 'blur(120px)',
          }}
        />
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative' style={{ zIndex: 10 }}>
        <div className='text-center'>
          <h1 className='text-5xl md:text-7xl font-black home-text-white mb-6 leading-tight'>
            {t('汇聚全球')}{' '}
            <span className='home-hero-highlight'>{t('顶尖AI模型')}</span>
          </h1>

          <p className='text-xl md:text-2xl home-text-slate-300 mb-10 max-w-3xl mx-auto'>
            {t('一个API，调用所有大模型。')}
            <br className='hidden md:block' />
            <span className='home-text-white font-semibold'>
              {t('原厂官方价 4-7 折')}
            </span>
            ，{t('为您节省 30%-60% 成本')}
          </p>

          <div className='flex flex-col items-center justify-center gap-4 mb-16'>
            <div className='flex flex-col sm:flex-row gap-4'>
              <Link to='/register'>
                <button
                  className='px-8 py-4 home-bg-white home-text-slate-900 rounded-2xl font-bold text-lg hover:home-hover-bg-slate-100 transition'
                  style={{
                    animation: 'home-pulse-glow 2s ease-in-out infinite',
                  }}
                >
                  <i className='ri-play-circle-line mr-2'></i>
                  {t('免费试用')}
                </button>
              </Link>
              {docsLink && (
                <button
                  onClick={() => window.open(docsLink, '_blank')}
                  className='px-8 py-4 rounded-2xl font-bold text-lg transition home-border-white-20 home-text-white'
                  style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}
                >
                  <i className='ri-file-text-line mr-2'></i>
                  {t('查看文档')}
                </button>
              )}
            </div>

            <div className='flex flex-col items-center mt-4'>
              <p className='home-text-slate-300 text-sm mb-2'>{t('只需要将模型基址替换为：')}</p>
              <div className='flex items-center gap-2'>
                <div className='flex items-center home-bg-white-10 backdrop-blur rounded-full px-4 py-2 home-border-white-20'>
                  <ScrollList
                    bodyHeight={32}
                    style={{ border: 'unset', boxShadow: 'unset', background: 'transparent' }}
                  >
                    <ScrollItem
                      mode='wheel'
                      cycled={true}
                      list={endpointItems}
                      selectedIndex={endpointIndex}
                      onSelect={({ index }) => setEndpointIndex(index)}
                    />
                  </ScrollList>
                  <span className='home-text-white font-mono text-sm px-4 whitespace-nowrap'>{serverAddress}</span>
                  <button
                    onClick={handleCopyBaseURL}
                    className='p-1.5 rounded-full hover:home-hover-bg-white-20 transition'
                  >
                    <IconCopy style={{ color: 'white' }} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className='grid grid-cols-2 md:grid-cols-3 gap-8 max-w-4xl mx-auto'>
            {[
              { num: '300+', label: t('AI模型') },
              { num: '40%', label: t('平均节省') },
              { num: '10B+', label: t('Token调用') },
            ].map((stat) => (
              <div key={stat.label} className='text-center'>
                <div className='text-4xl md:text-5xl font-black home-stat-number mb-2'>{stat.num}</div>
                <div className='home-text-slate-400'>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );

  const renderModelScroll = () => (
    <section id='models' className='py-16' style={{ background: 'var(--semi-color-bg-0)', borderBottom: '1px solid var(--semi-color-border)' }}>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8'>
        <div className='text-center'>
          <h2 className='text-3xl md:text-4xl font-bold text-semi-color-text-0 mb-4'>{t('覆盖全球主流模型')}</h2>
          <p className='text-semi-color-text-1 text-lg'>{t('OpenAI、Anthropic、Google、通义千问、DeepSeek... 一个都不能少')}</p>
        </div>
      </div>
      <div className='overflow-hidden'>
        <div className='flex home-model-scroll-anim' style={{ width: 'max-content' }}>
          {[0, 1].map((dup) => (
            <div key={dup} className='flex space-x-8 px-4'>
              {providerGroups.flat().map((Icon, idx) => (
                <div
                  key={`${dup}-${idx}`}
                  className='flex items-center px-6 py-3 rounded-xl border'
                  style={{
                    background: 'var(--semi-color-fill-0)',
                    borderColor: 'var(--semi-color-border)',
                  }}
                >
                  <Icon size={28} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  const renderFeatures = () => (
    <section id='features' className='py-24' style={{ background: 'var(--semi-color-bg-1)' }}>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='text-center mb-16'>
          <h2 className='text-3xl md:text-4xl font-bold text-semi-color-text-0 mb-4'>
            {t('为什么选择 '+getSystemName()+'？')}
          </h2>
          <p className='text-semi-color-text-1 text-lg max-w-2xl mx-auto'>
            {t('我们不只是聚合模型，更是为您提供极致的性价比和稳定性')}
          </p>
        </div>

        <div className='grid md:grid-cols-3 gap-8'>
          {[
            {
              icon: 'ri-money-dollar-circle-line',
              gradient: 'linear-gradient(135deg, #4ade80, #059669)',
              title: t('价格低廉透明'),
              items: [
                t('原厂官方价 4-7 折，直接节省 30%-60%'),
                t('原厂价与平台价同时展示，透明无套路'),
                t('按实际使用量计费，无最低消费'),
              ],
              accent: '#10b981',
            },
            {
              icon: 'ri-apps-2-line',
              gradient: 'linear-gradient(135deg, #60a5fa, #2563eb)',
              title: t('模型海量全面'),
              items: [
                t('覆盖 100+ 主流AI模型，持续更新'),
                t('文本、图像、语音、代码，全模态支持'),
                t('一个API统一调用，无需适配多个接口'),
              ],
              accent: '#3b82f6',
            },
            {
              icon: 'ri-shield-check-line',
              gradient: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
              title: t('服务稳定可靠'),
              items: [
                t('高可用部署，企业级保障'),
                t('多渠道智能负载均衡，自动故障转移'),
                t('7x24 技术支持，问题快速响应'),
              ],
              accent: '#8b5cf6',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className='home-card-hover rounded-3xl p-8 border'
              style={{
                background: 'var(--semi-color-bg-0)',
                borderColor: 'var(--semi-color-border)',
              }}
            >
              <div
                className='w-16 h-16 rounded-2xl flex items-center justify-center mb-6'
                style={{ background: feature.gradient }}
              >
                <i className={`${feature.icon} home-text-white text-3xl`}></i>
              </div>
              <h3 className='text-2xl font-bold text-semi-color-text-0 mb-4'>{feature.title}</h3>
              <ul className='space-y-3 text-semi-color-text-1'>
                {feature.items.map((item) => (
                  <li key={item} className='flex items-start'>
                    <i
                      className='ri-check-line mt-1 mr-2'
                      style={{ color: feature.accent }}
                    ></i>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  const renderPricing = () => (
    <section id='pricing' className='py-24' style={{ background: 'var(--semi-color-bg-0)' }}>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='text-center mb-16'>
          <h2 className='text-3xl md:text-4xl font-bold text-semi-color-text-0 mb-4'>
            {t('价格对比，一目了然')}
          </h2>
          <p className='text-semi-color-text-1 text-lg'>
            {t('同样的模型，更低的价格，为您节省真金白银')}
          </p>
        </div>

        <div className='grid md:grid-cols-2 lg:grid-cols-4 gap-6'>
          {pricingData.map((model) => (
            <div
              key={model.name}
              className='home-card-hover home-pricing-card rounded-3xl p-6 border'
              style={{ borderColor: 'var(--semi-color-border)' }}
            >
              <div className='flex items-center mb-4'>
                <div
                  className='w-12 h-12 rounded-xl flex items-center justify-center'
                  style={{ background: model.iconGradient }}
                >
                  <i className='ri-openai-line home-text-white text-xl'></i>
                </div>
                <div className='ml-3'>
                  <h4 className='font-bold text-semi-color-text-0'>{model.name}</h4>
                  <p className='text-xs' style={{ color: 'var(--semi-color-text-2)' }}>
                    {model.provider}
                  </p>
                </div>
              </div>
              <div className='space-y-3 mb-6'>
                <div className='flex justify-between items-center'>
                  <span className='text-sm' style={{ color: 'var(--semi-color-text-2)' }}>
                    {t('输入价格')}
                  </span>
                  <div className='text-right'>
                    <div className='home-price-strike text-sm'>{model.inputStrike}/1M</div>
                    <div className='text-xl font-bold' style={{ color: '#059669' }}>
                      {model.inputPrice}/1M
                    </div>
                  </div>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-sm' style={{ color: 'var(--semi-color-text-2)' }}>
                    {t('输出价格')}
                  </span>
                  <div className='text-right'>
                    <div className='home-price-strike text-sm'>{model.outputStrike}/1M</div>
                    <div className='text-xl font-bold' style={{ color: '#059669' }}>
                      {model.outputPrice}/1M
                    </div>
                  </div>
                </div>
              </div>
              <div
                className='rounded-xl px-4 py-2 text-center font-semibold'
                style={{ background: '#d1fae5', color: '#065f46' }}
              >
                {t('为您节省')} {model.savings}
              </div>
            </div>
          ))}
        </div>

        <div className='mt-12 text-center'>
          <p className='text-semi-color-text-1 mb-4'>{t('支持更多模型请查看')}</p>
          <Link to='/pricing'>
            <Button
              theme='solid'
              type='primary'
              className='!rounded-xl font-medium'
              style={{
                background: 'linear-gradient(135deg, #1e40af, #7c3aed, #db2777)',
              }}
            >
              {t('查看完整价格')} <i className='ri-arrow-right-s-line ml-1'></i>
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );

  const renderServices = () => (
    <section className='py-16' style={{ background: 'var(--semi-color-bg-1)' }}>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='text-center mb-8'>
          <h2 className='text-2xl md:text-3xl font-bold text-semi-color-text-0 mb-4'>
            {t('选择你的专属 AI 服务')}
          </h2>
          <p className='text-semi-color-text-1 text-lg'>{t('多种AI服务，总有一款适合你')}</p>
        </div>
        <div className='flex flex-wrap justify-center gap-3 max-w-4xl mx-auto'>
          {services.map((s) => (
            <span
              key={s}
              className='px-5 py-2.5 rounded-xl font-medium border text-sm'
              style={{
                background: 'var(--semi-color-fill-0)',
                borderColor: 'var(--semi-color-border)',
                color: 'var(--semi-color-text-0)',
              }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </section>
  );

  const renderTrust = () => (
    <section className='py-24 home-dark-gradient'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='text-center mb-16'>
          <h2 className='text-3xl md:text-4xl font-bold home-text-white mb-4'>
            {t('值得信赖的合作伙伴')}
          </h2>
          <p className='home-text-slate-300 text-lg'>
            {t('超过 100,000+ 开发者和企业正在使用')}
          </p>
        </div>

        <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8'>
          {[t('字节跳动'), t('阿里巴巴'), t('腾讯'), t('百度'), t('美团'), t('京东')].map((name) => (
            <div
              key={name}
              className='home-glass-card rounded-2xl p-6 flex items-center justify-center'
            >
              <span className='home-text-white font-bold text-lg'>{name}</span>
            </div>
          ))}
        </div>

        <div className='mt-16 grid md:grid-cols-3 gap-8'>
          {reviews.map((review) => (
            <div key={review.name} className='home-glass-card rounded-2xl p-6'>
              <div className='flex items-center mb-4 home-text-yellow-400'>
                {[...Array(5)].map((_, i) => (
                  <i key={i} className='ri-star-fill'></i>
                ))}
              </div>
              <p className='home-text-slate-200 mb-4'>{review.quote}</p>
              <div className='flex items-center'>
                <div
                  className='w-10 h-10 rounded-full flex items-center justify-center home-text-white font-bold'
                  style={{ background: review.bg }}
                >
                  {review.name.charAt(0)}
                </div>
                <div className='ml-3'>
                  <p className='home-text-white font-medium'>{review.name}</p>
                  <p className='home-text-slate-400 text-sm'>{review.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  const renderCTA = () => (
    <section className='py-24' style={{ background: 'var(--semi-color-bg-1)' }}>
      <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center'>
        <h2 className='text-4xl md:text-5xl font-black text-semi-color-text-0 mb-6'>
          {t('准备好开始了吗？')}
        </h2>
        <p className='text-xl text-semi-color-text-1 mb-10'>
          {t('立即注册，免费获得 $10 试用额度，体验所有顶尖AI模型')}
        </p>
        <div className='flex flex-col sm:flex-row gap-4 justify-center'>
          <Link to='/register'>
            <button
              className='px-10 py-4 home-text-white rounded-2xl font-bold text-xl hover:opacity-90 transition'
              style={{
                background: 'linear-gradient(135deg, #1e40af, #7c3aed, #db2777)',
              }}
            >
              <i className='ri-rocket-line mr-2'></i>
              {t('免费开始')}
            </button>
          </Link>
          <a
            href='https://github.com/QuantumNous/new-api'
            target='_blank'
            rel='noopener noreferrer'
          >
            <button
              className='px-10 py-4 rounded-2xl font-bold text-xl border transition'
              style={{
                background: 'var(--semi-color-bg-0)',
                color: 'var(--semi-color-text-0)',
                borderColor: 'var(--semi-color-border)',
              }}
            >
              <i className='ri-github-line mr-2'></i>
              GitHub
            </button>
          </a>
        </div>
      </div>
    </section>
  );

  const renderFooter = () => (
    <footer className='home-dark-gradient home-text-slate-400 py-16'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='grid md:grid-cols-4 gap-12 mb-12'>
          <div>
            <div className='flex items-center mb-6'>
              <div
                className='w-10 h-10 rounded-xl flex items-center justify-center'
                style={{ background: 'linear-gradient(135deg, #1e40af, #7c3aed, #db2777)' }}
              >
                <i className='ri-robot-2-line home-text-white text-2xl'></i>
              </div>
              <span className='ml-3 text-xl font-bold home-text-white'>{getSystemName()}</span>
            </div>
            <p className='home-text-slate-400 mb-6'>{t('汇聚全球顶尖AI模型，一个API，无限可能。')}</p>
            <div className='flex space-x-4'>
              <a
                href='https://github.com/QuantumNous/new-api'
                target='_blank'
                rel='noopener noreferrer'
                className='w-10 h-10 rounded-lg flex items-center justify-center hover:bg-slate-700 transition'
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                <i className='ri-github-fill text-xl'></i>
              </a>
            </div>
          </div>
          <div>
            <h4 className='home-text-white font-semibold mb-6'>{t('产品')}</h4>
            <ul className='space-y-3'>
              <li>
                <button
                  onClick={() => scrollToSection('models')}
                  className='home-text-white-hover transition'
                >
                  {t('模型广场')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('pricing')}
                  className='home-text-white-hover transition'
                >
                  {t('价格说明')}
                </button>
              </li>
              <li>
                <a href={docsLink || '#'} target='_blank' rel='noopener noreferrer' className='home-text-white-hover transition'>
                  {t('API文档')}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className='home-text-white font-semibold mb-6'>{t('支持')}</h4>
            <ul className='space-y-3'>
              <li>
                <a href='https://github.com/QuantumNous/new-api/issues' target='_blank' rel='noopener noreferrer' className='home-text-white-hover transition'>
                  {t('帮助中心')}
                </a>
              </li>
              <li>
                <a href='https://github.com/QuantumNous/new-api/issues' target='_blank' rel='noopener noreferrer' className='home-text-white-hover transition'>
                  {t('常见问题')}
                </a>
              </li>
              <li>
                <a href='https://github.com/QuantumNous/new-api' target='_blank' rel='noopener noreferrer' className='home-text-white-hover transition'>
                  {t('联系我们')}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className='home-text-white font-semibold mb-6'>{t('法律')}</h4>
            <ul className='space-y-3'>
              <li>
                <Link to='/user-agreement' className='home-text-white-hover transition'>
                  {t('服务条款')}
                </Link>
              </li>
              <li>
                <Link to='/privacy-policy' className='home-text-white-hover transition'>
                  {t('隐私政策')}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );

  return (
    <div className='w-full overflow-x-hidden'>
      <NoticeModal
        visible={noticeVisible}
        onClose={() => setNoticeVisible(false)}
        isMobile={isMobile}
      />
      {homePageContentLoaded && homePageContent === '' ? (
        <>
          {renderNav()}
          <main>
            {renderHero()}
            {renderModelScroll()}
            {renderFeatures()}
            {/* {renderPricing()} */}
            {renderServices()}
            {renderTrust()}
            {renderCTA()}
          </main>
          {renderFooter()}
        </>
      ) : (
        <div className='overflow-x-hidden w-full'>
          {homePageContent.startsWith('https://') ? (
            <iframe src={homePageContent} className='w-full h-screen border-none' title='homepage' />
          ) : (
            <div
              className='mt-[60px]'
              dangerouslySetInnerHTML={{ __html: homePageContent }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Home;
