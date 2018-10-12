let windowPos = {x: 0, y: 0, difX: 0, difY: 0};
$('#chat-header').mousedown((e)=>{
  windowPos.x = e.clientX;
  windowPos.y = e.clientY;
  $(window).on('mousemove', dragWindow);
})

$(window).mouseup((e)=>{
  $(window).off('mousemove', dragWindow);
})

function dragWindow(e){
  windowPos.difX = e.clientX - windowPos.x;
  windowPos.difY = e.clientY - windowPos.y;
  windowPos.x = e.clientX;
  windowPos.y = e.clientY;
  let elem = $('#chat-container');
  elem.css({"top": (elem.offset().top + windowPos.difY) + "px", "left": (elem.offset().left + windowPos.difX) + "px"})
}

$.fn.flash = function(){
  this.addClass("flash");
  setTimeout(()=>{
    this.removeClass("flash");
  },3000);
  return this;
}
