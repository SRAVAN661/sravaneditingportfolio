window.addEventListener("load",()=>setTimeout(()=>document.body.classList.remove("loading"),550));

const revealObserver=new IntersectionObserver(entries=>{
 entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add("visible");revealObserver.unobserve(e.target)}})
},{threshold:.12});
document.querySelectorAll(".reveal").forEach((el,i)=>{el.style.transitionDelay=Math.min(i*45,240)+"ms";revealObserver.observe(el)});

const glow=document.querySelector(".cursor-glow");
window.addEventListener("pointermove",e=>{if(glow&&innerWidth>900){glow.style.left=e.clientX+"px";glow.style.top=e.clientY+"px"}});

document.querySelectorAll(".reel-card video").forEach(v=>v.addEventListener("play",()=>{
 document.querySelectorAll(".reel-card video").forEach(o=>{if(o!==v)o.pause()})
}));

document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener("click",e=>{
 const t=document.querySelector(a.getAttribute("href")); if(t){e.preventDefault();t.scrollIntoView({behavior:"smooth"})}
}));

const reelsTrack = document.getElementById("reels-track");
const reelsPrev = document.getElementById("reels-prev");
const reelsNext = document.getElementById("reels-next");

if (reelsTrack && reelsPrev && reelsNext) {
  const scrollAmount = () => {
    const card = reelsTrack.firstElementChild;
    return card ? card.getBoundingClientRect().width + 22 : 300;
  };

  reelsPrev.addEventListener("click", () => {
    reelsTrack.scrollBy({
      left: -scrollAmount(),
      behavior: "smooth"
    });
  });

  reelsNext.addEventListener("click", () => {
    reelsTrack.scrollBy({
      left: scrollAmount(),
      behavior: "smooth"
    });
  });
}
