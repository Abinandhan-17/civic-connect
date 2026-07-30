/* Signature visual: a quiet grid of "city sensor" nodes that occasionally
   pulse red -> amber -> green, echoing the complaint status system used
   throughout the product. Rendered once behind the hero section. */
(function(){
  function init(){
    const holder = document.querySelector('.city-grid');
    if(!holder) return;
    const canvas = document.createElement('canvas');
    holder.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let W, H, nodes = [];
    const colors = ['#ff5d6c33','#f4c93b33','#33d17a33'];
    const glow    = ['#ff5d6c','#f4c93b','#33d17a'];

    function resize(){
      W = canvas.width = holder.clientWidth;
      H = canvas.height = holder.clientHeight;
      const gap = 46;
      nodes = [];
      for(let x=gap/2; x<W; x+=gap){
        for(let y=gap/2; y<H; y+=gap){
          if(Math.random() < 0.14){
            nodes.push({ x, y, phase: Math.random()*Math.PI*2, speed: 0.4+Math.random()*0.6, c: Math.floor(Math.random()*3) });
          }
        }
      }
    }
    function draw(t){
      ctx.clearRect(0,0,W,H);
      ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--grid-line');
      ctx.lineWidth = 1;
      const gap = 46;
      for(let x=0;x<W;x+=gap){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
      for(let y=0;y<H;y+=gap){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

      nodes.forEach(n=>{
        const pulse = (Math.sin(t*0.0006*n.speed + n.phase) + 1) / 2;
        const r = 2 + pulse*3.5;
        ctx.beginPath();
        ctx.fillStyle = glow[n.c] + Math.floor(pulse*90+20).toString(16).padStart(2,'0');
        ctx.arc(n.x, n.y, r, 0, Math.PI*2);
        ctx.fill();
      });
      requestAnimationFrame(draw);
    }
    window.addEventListener('resize', resize);
    resize();
    if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      requestAnimationFrame(draw);
    } else {
      draw(0);
    }
  }
  document.addEventListener('DOMContentLoaded', init);
})();
