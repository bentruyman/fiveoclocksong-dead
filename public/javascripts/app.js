$(function(){
	$('#songs a').each(function (index) {
		$(this).click(function (event) {
			event.preventDefault();
			$.post('/vote', {
				index: index
			});
		});
		
		$(this).mouseenter(function(){
			$(this).stop().animate({
				backgroundColor: "#DEDEDE"
			},250);
		}).mouseleave(function(){
			$(this).stop().animate({
				backgroundColor: "#FFFFFF"
			},250);
		});
		
	});
	
	$('#songs div.voted').css({
		opacity: 0
	});
	
	$('#songs div.play-pause div').each(function(index){
		// find our audio element from the batch
		
		$(this).click(function(){

			var audioEls = document.getElementsByTagName("audio");
			var audioEl = audioEls[index];
			
			if(audioEl.paused){
				for(i=0;i<audioEls.length;i++){
					if(i==index){
						audioEls[i].play();
						$(this).css({
							backgroundPosition: '0px 0px'
						});
					}else{
						audioEls[i].pause()
						$(this).css({
							backgroundPosition: '-50px 0px'
						});
					}
				}
			}else{
				audioEl.pause();
				$(this).css({
					backgroundPosition: '-50px 0px'
				});
			}
			
		});
	});
	
	$('#songs .votes').mouseenter(function(){
		
		var pos = $(this).position();
		var w = $(this).outerWidth();
		var h = $(this).outerHeight();
		
		
		$(this).next().css({
			left: pos.left + w,
			top: "-5px"
		}).animate({
			opacity: 1
		},150);
		
	}).mouseleave(function(){
		$(this).next().animate({
			opacity: 0
		},150);
		
	});
	
	// Longpoll
	(function poll(){
		$.getJSON('/songs', function (songs) {
			$('#songs li').each(function (index) {
				var cEl = $('.votes', this);
				var oldVal = cEl.html();
				var newVal = songs[index];
				
				if(oldVal != newVal){
					$(cEl).animate({
						color: '#ffffff'
					},120,function(){
						$(this).html(songs[index]).animate({
							color: '#000000'
						},120);
					});
				}
			});
			poll();
		});
	})();
});