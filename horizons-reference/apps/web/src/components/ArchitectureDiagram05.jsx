import React from 'react';

const ArchitectureDiagram05 = () => {
  const layers = [
    { title: "Product Discovery Layer", subs: "Trend Analysis • Winning Product Finder", color: "#00D9FF", id: "blue" },
    { title: "Store Layer", subs: "Shopify Store • Product Pages", color: "#9D4EDD", id: "purple" },
    { title: "Ad Creation Layer", subs: "AI Video Ads • AI Ad Copy", color: "#FF6B35", id: "orange" },
    { title: "Traffic Layer", subs: "TikTok Ads • Facebook Ads", color: "#00D9FF", id: "blue" },
    { title: "Conversion Layer", subs: "Checkout System • Payment Processing", color: "#9D4EDD", id: "purple" },
    { title: "Fulfillment Layer", subs: "Supplier Systems • Order Automation", color: "#FF6B35", id: "orange" },
    { title: "Automation Layer", subs: "Workflow Automation • Trigger Systems", color: "#00D9FF", id: "blue" },
    { title: "Data & Optimization Layer", subs: "Ad Performance Tracking • Product Scaling", color: "#9D4EDD", id: "purple" },
  ];

  const startY = 60;
  const boxHeight = 80;
  const gap = 35;
  const boxWidth = 500;
  const centerX = 400;
  const boxX = centerX - boxWidth / 2;

  return (
    <div className="w-full relative rounded-xl overflow-hidden bg-[#0a0f1c] border border-border/50 shadow-2xl flex justify-center items-center p-4">
      <svg 
        viewBox="0 0 800 1050" 
        className="w-full h-auto max-w-4xl"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Background Grid Pattern */}
          <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          </pattern>

          {/* Glow Filters */}
          <filter id="glow-blue" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-purple" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-orange" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Arrow Markers */}
          <marker id="arrow-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#00D9FF" />
          </marker>
          <marker id="arrow-purple" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#9D4EDD" />
          </marker>
          <marker id="arrow-orange" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#FF6B35" />
          </marker>

          {/* Gradients for connecting lines */}
          {layers.map((layer, i) => {
            if (i === layers.length - 1) return null;
            const nextLayer = layers[i + 1];
            return (
              <linearGradient key={`grad-${i}`} id={`grad-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={layer.color} />
                <stop offset="100%" stopColor={nextLayer.color} />
              </linearGradient>
            );
          })}
        </defs>

        {/* Background */}
        <rect width="100%" height="100%" fill="url(#gridPattern)" />

        {/* Connections */}
        {layers.map((layer, i) => {
          if (i === layers.length - 1) return null;
          const y1 = startY + (i * (boxHeight + gap)) + boxHeight;
          const y2 = startY + ((i + 1) * (boxHeight + gap)) - 8; // -8 for arrow head
          const nextLayer = layers[i + 1];
          
          return (
            <g key={`conn-${i}`}>
              {/* Static background line for connection */}
              <line 
                x1={centerX} y1={y1} 
                x2={centerX} y2={y2 + 8} 
                stroke={`url(#grad-${i})`} 
                strokeWidth="1" 
                opacity="0.3"
              />
              
              {/* Animated flowing line */}
              <line 
                x1={centerX} y1={y1} 
                x2={centerX} y2={y2} 
                stroke={`url(#grad-${i})`} 
                strokeWidth="3" 
                strokeDasharray="12 12"
                markerEnd={`url(#arrow-${nextLayer.id})`}
                filter={`url(#glow-${nextLayer.id})`}
              >
                <animate 
                  attributeName="stroke-dashoffset" 
                  values="24;0" 
                  dur="1.5s" 
                  repeatCount="indefinite" 
                  calcMode="linear"
                />
              </line>
            </g>
          );
        })}

        {/* Layers */}
        {layers.map((layer, i) => {
          const y = startY + (i * (boxHeight + gap));
          
          return (
            <g key={`layer-${i}`} className="group">
              {/* Box Background */}
              <rect 
                x={boxX} 
                y={y} 
                width={boxWidth} 
                height={boxHeight} 
                rx="12" 
                fill={layer.color} 
                fillOpacity="0.05" 
                stroke={layer.color} 
                strokeWidth="1.5" 
                filter={`url(#glow-${layer.id})`}
              />
              
              {/* Internal subtle highlight */}
              <rect 
                x={boxX + 2} 
                y={y + 2} 
                width={boxWidth - 4} 
                height={boxHeight - 4} 
                rx="10" 
                fill="none" 
                stroke="#ffffff" 
                strokeOpacity="0.05" 
                strokeWidth="1" 
              />

              {/* Layer Number Badge */}
              <rect 
                x={boxX - 20} 
                y={y + 20} 
                width="40" 
                height="40" 
                rx="8" 
                fill="#0a0f1c" 
                stroke={layer.color} 
                strokeWidth="2" 
              />
              <text 
                x={boxX} 
                y={y + 46} 
                fill="#ffffff" 
                fontSize="18" 
                fontWeight="bold" 
                fontFamily="sans-serif" 
                textAnchor="middle"
              >
                {i + 1}
              </text>

              {/* Text Content */}
              <text 
                x={centerX} 
                y={y + 35} 
                fill="#ffffff" 
                fontSize="20" 
                fontWeight="800" 
                fontFamily="sans-serif" 
                textAnchor="middle"
                letterSpacing="1"
              >
                {layer.title}
              </text>
              <text 
                x={centerX} 
                y={y + 60} 
                fill="#94a3b8" 
                fontSize="14" 
                fontWeight="500" 
                fontFamily="sans-serif" 
                textAnchor="middle"
                letterSpacing="0.5"
              >
                {layer.subs}
              </text>
            </g>
          );
        })}

        {/* Bottom Flow Label */}
        <g transform={`translate(${centerX}, ${startY + (layers.length * (boxHeight + gap)) + 20})`}>
          <rect 
            x="-350" y="-25" 
            width="700" height="50" 
            rx="25" 
            fill="#00D9FF" fillOpacity="0.05" 
            stroke="#00D9FF" strokeOpacity="0.3" strokeWidth="1" 
          />
          <text 
            x="0" y="5" 
            fill="#00D9FF" 
            fontSize="14" 
            fontWeight="bold" 
            fontFamily="monospace" 
            textAnchor="middle"
            filter="url(#glow-blue)"
            letterSpacing="1"
          >
            Product → Store → Ads → Traffic → Sales → Fulfillment → Scale
          </text>
        </g>
      </svg>
    </div>
  );
};

export default ArchitectureDiagram05;