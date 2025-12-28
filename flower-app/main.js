/* ---------------utility functions------------------*/
//makees the color lighter for the flower petals
function lightenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  let R = (num >> 16) + amt;
  let G = ((num >> 8) & 0x00FF) + amt;
  let B = (num & 0x0000FF) + amt;

  R = R > 255 ? 255 : R;
  G = G > 255 ? 255 : G;
  B = B > 255 ? 255 : B;

  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

const darkenColor = (hex, percent) => lightenColor(hex, -percent);

//check if color is light or dark so we can add the right shadow
function isColorLight(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness >= 128;
}

// get the right text shadow depending on brightness
function getTextShadow(color) {
  if (isColorLight(color)) {
    return '0 2px 4px rgba(0, 0, 0, 0.3)';
  } else {
    return `
      0 0 10px ${color},
      0 0 20px ${color},
      0 0 30px ${color},
      0 0 40px ${color}
    `;
  }
}

/* ---------------url------------------*/
//encode all the settings into a shareable link
function generateShareableLink(flowerType, flowerColor, message) {
  const config = {
    type: flowerType,
    fc: flowerColor,  // fc = flower color
    msg: message
  };

  console.log('Generating link with config:', config);

  const encoded = btoa(JSON.stringify(config))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${window.location.origin}${window.location.pathname}?f=${encoded}`;
}

//decode the URL parameter
function decodeShareLink(encodedData) {
  try {
    const base64 = encodedData
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    const decoded = JSON.parse(atob(base64 + padding));
    console.log('Decoded config:', decoded);
    return decoded;
  } catch(e) {
    console.error('failed to decode:', e);
    return null;
  }
}

/* ---------------react------------------*/
const { useState, useEffect } = React;

//main app component
function App() {
  //state management
  const [flowerType, setFlowerType] = useState('rose');
  const [flowerColor, setFlowerColor] = useState('#f672b0');
  const [message, setMessage] = useState('hi!');
  const [isSharedView, setIsSharedView] = useState(false);
  const [extraFlowers, setExtraFlowers] = useState([]);
  const [seeds, setSeeds] = useState([1, 2, 3, 4, 5]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [activeTab, setActiveTab] = useState('preview'); //for mobile: 'config' or 'preview'

  //check if someone opened a shared link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('f');

    if (encoded) {
      const config = decodeShareLink(encoded);
      if (config) {
        setFlowerType(config.type);
        setFlowerColor(config.fc);
        setMessage(config.msg);
        setIsSharedView(true);
      }
    }
  }, []);

  //track viewport size to switch between mobile and desktop layouts
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  //plant new flower when someone clicks a seed
  const handlePlantSeed = (index) => {
    if (extraFlowers.length >= 5) return;

    setSeeds(seeds.filter((_, i) => i !== index));

    const percentToNumber = (s) => {
      if (typeof s === 'string' && s.endsWith('%')) return parseFloat(s.slice(0, -1));
      if (typeof s === 'number') return s;
      return parseFloat(s) || 50;
    };

    //figure out where flowers already are so we dont overlap
    const occupied = [];
    //the 3 flowers we always show
    occupied.push(35, 50, 65);
    //any extra flowers already planted
    extraFlowers.forEach(f => occupied.push(percentToNumber(f.left)));

    const pickNonOverlappingLeft = (minLeft = 10, maxLeft = 90, minGap = 10, attempts = 20) => {
      for (let t = 0; t < attempts; t++) {
        const candidate = Math.floor(Math.random() * (maxLeft - minLeft + 1)) + minLeft;
        let ok = true;
        for (const o of occupied) {
          if (Math.abs(candidate - o) < minGap) {
            ok = false;
            break;
          }
        }
        if (ok) return candidate;
      }
      //if we cant find a perfect spot just use a smaller gap
      for (let t = 0; t < attempts; t++) {
        const candidate = Math.floor(Math.random() * (maxLeft - minLeft + 1)) + minLeft;
        let ok = true;
        for (const o of occupied) {
          if (Math.abs(candidate - o) < Math.max(4, Math.floor(minGap / 2))) {
            ok = false;
            break;
          }
        }
        if (ok) return candidate;
      }
      return Math.floor(Math.random() * (maxLeft - minLeft + 1)) + minLeft;
    };

    const leftPercent = pickNonOverlappingLeft(12, 88, 10, 25);
    const left = `${leftPercent}%`;

    const rotation = Math.floor(Math.random() * 41) - 20;

    const height = `${Math.floor(Math.random() * 21) + 40}vmin`;

    setExtraFlowers([...extraFlowers, {
      id: Date.now(),
      left,
      rotation,
      height
    }]);
  };

  //show fullscreen if its a shared link or editing mode if not
  if (isSharedView) {
    return (
      <div className="shared-view">
        <FullscreenDisplay
          flowerType={flowerType}
          flowerColor={flowerColor}
          message={message}
          extraFlowers={extraFlowers}
          seeds={seeds}
          onPlantSeed={handlePlantSeed}
        />
      </div>
    );
  }

  //mobile layout with tabs
  if (isMobile) {
    return (
      <div className="app-container mobile-layout">
        <div className="mobile-tabs">
          <button
            className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            Preview
          </button>
          <button
            className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            Settings
          </button>
        </div>

        <div className="mobile-content">
          {activeTab === 'preview' ? (
            <PreviewPanel
              flowerType={flowerType}
              flowerColor={flowerColor}
              message={message}
              extraFlowers={extraFlowers}
              seeds={seeds}
              onPlantSeed={handlePlantSeed}
              onGenerateLink={() => {
                return generateShareableLink(flowerType, flowerColor, message);
              }}
            />
          ) : (
            <ConfigPanel
              flowerType={flowerType}
              setFlowerType={setFlowerType}
              flowerColor={flowerColor}
              setFlowerColor={setFlowerColor}
              message={message}
              setMessage={setMessage}
            />
          )}
        </div>
      </div>
    );
  }

  //desktop layout
  return (
    <div className="app-container">
      <div className="editing-mode">
        <ConfigPanel
          flowerType={flowerType}
          setFlowerType={setFlowerType}
          flowerColor={flowerColor}
          setFlowerColor={setFlowerColor}
          message={message}
          setMessage={setMessage}
        />

        <PreviewPanel
          flowerType={flowerType}
          flowerColor={flowerColor}
          message={message}
          extraFlowers={extraFlowers}
          seeds={seeds}
          onPlantSeed={handlePlantSeed}
          onGenerateLink={() => {
            return generateShareableLink(flowerType, flowerColor, message);
          }}
        />
      </div>
    </div>
  );
}

//config panel on the left
function ConfigPanel({
  flowerType, setFlowerType,
  flowerColor, setFlowerColor,
  message, setMessage
}) {
  return (
    <div className="config-panel">
      <h1 style={{fontFamily: 'FlowerLabel, sans-serif'}}><img src="img/Logo.png" alt="Logo" style={{width: '24px', height: '24px', borderRadius: '50%', verticalAlign: 'middle', marginRight: '8px'}} /> GitFlowers</h1>

      {/*Flower Type Selector*/}
      <div className="flower-type-selector">
        <label className="section-label">Choose Your Flower</label>
        <div className="type-options">
          <label className="type-option">
            <input
              type="radio"
              name="flowerType"
              value="rose"
              checked={flowerType === 'rose'}
              onChange={(e) => setFlowerType(e.target.value)}
            />
            <img src="img/Rose.png" alt="Rose" className="type-icon" width="50" height="50" />
            <div className="type-info">
              <span className="type-name">Rose</span>
            </div>
          </label>

          <label className="type-option">
            <input
              type="radio"
              name="flowerType"
              value="tulip"
              checked={flowerType === 'tulip'}
              onChange={(e) => setFlowerType(e.target.value)}
            />
            <img src="img/tulip.png" alt="Tulip" className="type-icon" width="50" height="50" />
            <div className="type-info">
              <span className="type-name">Tulip</span>
            </div>
          </label>

          <label className="type-option">
            <input
              type="radio"
              name="flowerType"
              value="lily"
              checked={flowerType === 'lily'}
              onChange={(e) => setFlowerType(e.target.value)}
            />
            <img src="img/lilly.png" alt="Lily" className="type-icon" width="50" height="50" />
            <div className="type-info">
              <span className="type-name">Lily</span>
            </div>
          </label>
        </div>
      </div>

      {/*Flower Color*/}
      <div className="color-section">
        <label className="section-label">Flower Color</label>
        <input
          type="color"
          value={flowerColor}
          onChange={(e) => setFlowerColor(e.target.value)}
          className="color-input"
        />
        <span className="color-hex">{flowerColor}</span>
      </div>

      {/*Message Input*/}
      <div className="message-section">
        <label className="section-label">Message</label>

        <div className="message-input-wrapper">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="hi!"
            maxLength={100}
            className="message-textarea"
          />
          <span className="char-count">{message.length}/100</span>
        </div>
      </div>
    </div>
  );
}

//preview panel where you see the flowers
function PreviewPanel({
  flowerType, flowerColor, message,
  extraFlowers, seeds, onPlantSeed, onGenerateLink
}) {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    const url = onGenerateLink();
    setLinkUrl(url);
    setShowLinkModal(true);
    console.log('Generated link:', url);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(linkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch(err) {

      console.warn('Clipboard API failed, using fallback');
      const textArea = document.createElement('textarea');
      textArea.value = linkUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <div className="preview-panel">
        <div className="preview-screen">
          <div className="preview-viewport">
            {message && (
              <TypewriterText
                text={message}
                color="#ffffff"
              />
            )}

            <div className="flowers-preview" style={{
              position: 'absolute',
              bottom: 0,
              left: '50%',
              width: '100%',
              height: '70%'
            }}>
            {/*the 3 flowers we always show */}
            <Flower
            type={flowerType}
            color={flowerColor}
            position={{ left: '35%' }}
            delay={0.8}
            height="45vmin"
            rotation={-8}
            scale={0.5}
          />
          <Flower
            type={flowerType}
            color={flowerColor}
            position={{ left: '50%' }}
            delay={1.1}
            height="50vmin"
            rotation={0}
            scale={0.5}
          />
          <Flower
            type={flowerType}
            color={flowerColor}
            position={{ left: '65%' }}
            delay={0.9}
            height="42vmin"
            rotation={10}
            scale={0.5}
          />

            {/*flowers planted from clicking seeds*/}
            {extraFlowers.map((flower) => (
              <Flower
                key={flower.id}
                type={flowerType}
                color={flowerColor}
                position={{ left: flower.left }}
                delay={0.5}
                height={flower.height}
                rotation={flower.rotation}
                scale={0.5}
              />
            ))}

            {/*grass everywhere*/}
            {[...Array(25)].map((_, i) => {
              const positions = ['8%', '12%', '18%', '22%', '28%', '32%', '38%', '42%', '48%', '52%', '58%', '62%', '68%', '72%', '78%', '82%', '88%', '92%', '15%', '25%', '35%', '45%', '55%', '65%', '75%'];
              const heights = ['28vmin', '32vmin', '35vmin', '30vmin', '38vmin', '26vmin', '34vmin', '29vmin', '36vmin', '31vmin', '33vmin', '27vmin', '37vmin', '30vmin', '32vmin', '35vmin', '28vmin', '34vmin', '31vmin', '29vmin', '36vmin', '33vmin', '30vmin', '32vmin', '35vmin'];
              const delays = [0, 0.1, 0.2, 0.15, 0.3, 0.25, 0.4, 0.35, 0.5, 0.45, 0.6, 0.55, 0.7, 0.65, 0.8, 0.75, 0.9, 0.85, 1.0, 0.95, 1.1, 1.05, 1.2, 1.15, 1.25];
              return (
                <div
                  key={`grass-${i}`}
                  className="grass"
                  style={{
                    left: positions[i],
                    height: heights[i],
                    animationDelay: `${delays[i]}s`
                  }}
                />
              );
            })}
          </div>

          {/* seeds you can click to plant more flowers */}
          <div className="seeds-container">
            {seeds.map((seed, index) => {
              //scatter them around 
              const scatterPositions = [
                { left: '25%', bottom: '12%' },
                { left: '42%', bottom: '8%' },
                { left: '58%', bottom: '15%' },
                { left: '73%', bottom: '10%' },
                { left: '35%', bottom: '18%' }
              ];
              const pos = scatterPositions[index] || { left: '50%', bottom: '10%' };

              return (
                <div
                  key={seed}
                  className="seed"
                  onClick={() => onPlantSeed(index)}
                  title="Click to grow more flowers!"
                  style={{ left: pos.left, bottom: pos.bottom }}
                />
              );
            })}
          </div>
          </div>
        </div>
      </div>

      {/*generate button*/}
      <div className="generate-section">
        <button
          className="generate-btn"
          onClick={handleGenerate}
          style={{
            backgroundImage: 'url(img/Generate.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <span style={{fontFamily: 'FlowerLabel, sans-serif'}}>Generate</span>
        </button>

        {showLinkModal && (
          <div className="link-modal">
            <div className="link-header">Share this link:</div>
            <div className="link-wrapper">
              <input
                type="text"
                value={linkUrl}
                readOnly
                className="link-input"
                onClick={(e) => e.target.select()}
              />
              <button className="copy-btn" onClick={copyToClipboard}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button
              className="close-modal"
              onClick={() => setShowLinkModal(false)}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </>
  );
}

//flower component that draws all the different flower types
function Flower({ type, color, position, delay, height, rotation, scale = 0.5 }) {
  //rose has 18 petals in rings
  const renderRosePetals = () => {
    const petals = [];

    for (let i = 1; i <= 18; i++) {
      petals.push(
        <div
          key={i}
          className={`rose__petal rose__petal--${i}`}
          style={{
            backgroundColor: color,
            backgroundImage: `linear-gradient(to top, ${color}, ${color})`
          }}
        />
      );
    }
    return petals;
  };

  //tulip has 3 outer and 3 inner petals
  const renderTulipPetals = () => {
    const outerPetals = [];
    const innerPetals = [];
    const darkColor = darkenColor(color, 20);
    const lightColor = lightenColor(color, 20);

    for (let i = 1; i <= 3; i++) {
      outerPetals.push(
        <div
          key={`outer-${i}`}
          className={`tulip__petal-outer tulip__petal-outer--${i}`}
          style={{ background: `linear-gradient(to top, ${darkColor}, ${color})` }}
        />
      );
      innerPetals.push(
        <div
          key={`inner-${i}`}
          className={`tulip__petal-inner tulip__petal-inner--${i}`}
          style={{ background: `linear-gradient(to top, ${darkColor} 20%, ${color} 60%, ${lightColor})` }}
        />
      );
    }

    return [...outerPetals, ...innerPetals];
  };

  //lily has 6 tepals 
  const renderLilyPetals = () => {
    const petals = [];
    const lightColor = lightenColor(color, 40);

    for (let i = 1; i <= 6; i++) {
      petals.push(
        <div
          key={i}
          className={`lily__petal lily__petal--${i}`}
          style={{ backgroundImage: `linear-gradient(to top, ${lightenColor(color, 20)}, ${lightColor})` }}
        />
      );
    }
    return petals;
  };

  //render the right petals for each type
  const renderPetals = () => {
    if (type === 'rose') {
      return renderRosePetals();
    } else if (type === 'tulip') {
      return renderTulipPetals();
    } else if (type === 'lily') {
      return renderLilyPetals();
    }
    return null;
  };

  //render the center stuff (stamens and pistils for lily)
  const renderCenter = () => {
    if (type === 'rose') {
      return null; //roses dont need this
    } else if (type === 'tulip') {
      return null; //tulips dont either
    } else if (type === 'lily') {
      return (
        <>
          <div className="lily__stamen lily__stamen--1" />
          <div className="lily__stamen lily__stamen--2" />
          <div className="lily__stamen lily__stamen--3" />
          <div className="lily__stamen lily__stamen--4" />
          <div className="lily__stamen lily__stamen--5" />
          <div className="lily__stamen lily__stamen--6" />
          <div className="lily__pistil" />
        </>
      );
    }
    return null;
  };

  //little sparkle particles floating up from the flowers
  const renderLights = () => {
    const lightColor = lightenColor(color, 30);

    //tulips get extra sparkles (little biased)
    if (type === 'tulip') {
      const positions = ['45%', '55%', '40%', '60%', '50%', '48%', '52%', '46%', '43%', '57%', '38%', '62%'];
      const delays = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 0.8, 0.9, 1.5, 2.1];
      return positions.map((pos, idx) => (
        <div
          key={`light-${idx}`}
          className={`tulip__light`}
          style={{
            left: pos,
            animationDelay: `${delays[idx]}s`,
            backgroundColor: idx % 2 === 0 ? color : lightColor,
            width: idx % 3 === 0 ? '1.4vmin' : '1vmin',
            height: idx % 3 === 0 ? '1.4vmin' : '1vmin',
            boxShadow: `0 0 ${idx % 3 === 0 ? '0.8vmin' : '0.5vmin'} ${idx % 2 === 0 ? color : lightColor}`
          }}
        />
      ));
    }

    return [1, 2, 3, 4, 5, 6, 7, 8].map(i => (
      <div
        key={`light-${i}`}
        className={`${type}__light ${type}__light--${i}`}
        style={{ backgroundColor: i % 2 === 0 ? color : lightColor }}
      />
    ));
  };

  //leaves on the stem
  const renderStemLeaves = () => {
    return [1, 2, 3, 4, 5, 6].map(i => (
      <div key={`leaf-${i}`} className={`flower__line__leaf flower__line__leaf--${i}`} />
    ));
  };

  return (
    <div
      className="flower"
      style={{
        left: position.left || '50%',
        transform: `translateX(-50%) rotate(${rotation}deg) scale(${scale})`
      }}
    >
      <div
        className={`flower__leafs flower__leafs--${type}`}
        style={{ animationDelay: `${delay}s` }}
      >
        {renderPetals()}
        {renderCenter()}
        {renderLights()}
      </div>

      <div
        className="flower__line"
        style={{
          height,
          animationDelay: `${delay - 0.8}s`
        }}
      >
        {renderStemLeaves()}
      </div>
    </div>
  );
}

//typewriter effect that types out the message
function TypewriterText({ text, color, speed = 80 }) {
  const [displayText, setDisplayText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    setDisplayText('');
    let index = 0;

    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.substring(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
        setShowCursor(false);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return (
    <div
      className="typewriter-text"
      style={{
        color: color,
        textShadow: getTextShadow(color)
      }}
    >
      {displayText}
      {showCursor && <span className="cursor">|</span>}
    </div>
  );
}

//fullscreen view when someone opens your link
function FullscreenDisplay({
  flowerType, flowerColor, message,
  extraFlowers, seeds, onPlantSeed
}) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: '#000',
      zIndex: 9999
    }}>
      {message && (
        <TypewriterText
          text={message}
          color="#ffffff"
        />
      )}

      <div className="flowers-preview" style={{
        position: 'absolute',
        bottom: 0,
        left: '50%',
        width: '100%',
        height: '70%'
      }}>
        {/* Multiple initial flowers */}
        <Flower
          type={flowerType}
          color={flowerColor}
          position={{ left: '35%' }}
          delay={0.8}
          height="45vmin"
          rotation={-8}
        />
        <Flower
          type={flowerType}
          color={flowerColor}
          position={{ left: '50%' }}
          delay={1.1}
          height="50vmin"
          rotation={0}
        />
        <Flower
          type={flowerType}
          color={flowerColor}
          position={{ left: '65%' }}
          delay={0.9}
          height="42vmin"
          rotation={10}
        />

        {extraFlowers.map((flower) => (
          <Flower
            key={flower.id}
            type={flowerType}
            color={flowerColor}
            position={{ left: flower.left }}
            delay={0.5}
            height={flower.height}
            rotation={flower.rotation}
          />
        ))}

        {/*grass everywhere */}
        {[...Array(25)].map((_, i) => {
          const positions = ['8%', '12%', '18%', '22%', '28%', '32%', '38%', '42%', '48%', '52%', '58%', '62%', '68%', '72%', '78%', '82%', '88%', '92%', '15%', '25%', '35%', '45%', '55%', '65%', '75%'];
          const heights = ['28vmin', '32vmin', '35vmin', '30vmin', '38vmin', '26vmin', '34vmin', '29vmin', '36vmin', '31vmin', '33vmin', '27vmin', '37vmin', '30vmin', '32vmin', '35vmin', '28vmin', '34vmin', '31vmin', '29vmin', '36vmin', '33vmin', '30vmin', '32vmin', '35vmin'];
          const delays = [0, 0.1, 0.2, 0.15, 0.3, 0.25, 0.4, 0.35, 0.5, 0.45, 0.6, 0.55, 0.7, 0.65, 0.8, 0.75, 0.9, 0.85, 1.0, 0.95, 1.1, 1.05, 1.2, 1.15, 1.25];
          return (
            <div
              key={`grass-fullscreen-${i}`}
              className="grass"
              style={{
                left: positions[i],
                height: heights[i],
                animationDelay: `${delays[i]}s`
              }}
            />
          );
        })}
      </div>

      {/*seeds scattered around*/}
      <div className="seeds-container">
        {seeds.map((seed, index) => {
          const scatterPositions = [
            { left: '25%', bottom: '12%' },
            { left: '42%', bottom: '8%' },
            { left: '58%', bottom: '15%' },
            { left: '73%', bottom: '10%' },
            { left: '35%', bottom: '18%' }
          ];
          const pos = scatterPositions[index] || { left: '50%', bottom: '10%' };

          return (
            <div
              key={seed}
              className="seed"
              onClick={() => onPlantSeed(index)}
              title="Click to grow more flowers!"
              style={{ left: pos.left, bottom: pos.bottom }}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ---------------start the app------------------*/

//render everything to the page
ReactDOM.render(<App />, document.getElementById('root'));

//log when its loaded
window.onload = () => {
  console.log('Loaded');
};
