$(document).ready(function(){
	var flAudio = ({
		init: function(){

			var params = {
				menu: "false",
				allowScriptAccess: "always"
			};

			var flashvars = {};
			var attributes = {
				id:"fallback-player",
				name:"fallback-player"
			};

			swfobject.embedSWF("/public/swf/player.swf", "fallback-player", "1", "1", "9.0.0","", flashvars, params, attributes);

		},
		getFlashMovie: function(movieName){
			var isIE = navigator.appName.indexOf("Microsoft") != -1;
			return (isIE) ? window[movieName] : document[movieName];
		},
		loadSong: function(song){
			var player = this.getFlashMovie("fallback-player");
			player.loadSong(song);
		},
		pauseSong: function(){
			var player = this.getFlashMovie("fallback-player");
			player.pauseSong();
		},
		playSong: function(){
			var player = this.getFlashMovie("fallback-player");
			player.playSong();
		},
		flashMsg: function(msg){
			if($.browser.msie){
				alert("as: " + msg);
			}else{
				console.log("as: " + msg);
			}
		}
	});	
	
	$('#songs a').each(function (index) {
		$(this).click(function (event) {
			event.preventDefault();
			$.post('/vote', {
				index: index
			});
		});

		var bg = "#DEDEDE";
		var fc = "#000000";
		switch(index){
			case 0:
			bg = "#FDB112";
			fc = "#000000";
			break;
			case 1:
			bg = "#AA1622";
			fc = "#FFFFFF";
			break;
			case 2:
			bg = "#0D4F59";
			fc = "#FFFFFF";
			break;
			case 3:
			bg = "#C6BD95";
			fc = "#000000";
			break;
			case 4:
			bg = "#DEDEDE";
			fc = "#000000";
			break;
			default:
			bg = "#DEDEDE";
			fc = "#000000";
			break;
		}
		
		$(this).mouseenter(function(){
			$(this).stop().animate({
				backgroundColor: bg,
				color: fc
			},250);
		}).mouseleave(function(){
			$(this).stop().animate({
				backgroundColor: "#FFFFFF",
				color: "#000000"
			},250);
		});
		
	});
	
	$('#songs div.voted').css({
		opacity: 0
	});

	/*
	var canPlayMp3 = (document.createElement('audio').canPlayType('audio/mpeg'));
	if (canPlayMp3 == ""){
		// change source of each audio file to ogg for ff
		// sorry IE, you're SOL
		console.log($("audio source"));
		$("audio source").each(function(){
			console.log(this);
			var ogg = $(this).attr("src").replace('.mp3','.ogg');
			$(this).attr('src',ogg);
			$(this).attr('type','audio/ogg');
		});
	} 	
	*/

	$('#songs div.play-pause div').each(function(index){
		
		$(this).click(function(){
			var canPlayMp3 = (document.createElement('audio').canPlayType('audio/mpeg'));
			var button = $(this);
			var aEls = $("audio");
			var aEl = $(aEls).get(index)[0];
			

				$(aEls).each(function(i){
					if(index == i){
						if(this.paused){
							this.play();
							$(button).css({
								backgroundPosition: '-50px 0px'
							});
						}else{
							this.pause();
							$(button).css({
								backgroundPosition: '0px 0px'
							});
						}
					}else{
						this.pause();

					}

				});			
				

			
		});
	});

	$('#songs .votes').mouseenter(function(){
		
		var pos = $(this).position();
		var w = $(this).outerWidth();
		
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
		$.getJSON('/status', function (songs) {
			$('#songs li').each(function (index) {
				var cEl = $('.votes', this);
				var vEl = $('.voted', this);
				var oldVal = cEl.html();
				var newVal = songs.votes[index];
				
				if(oldVal != newVal){
					$(cEl).animate({
						color: '#ffffff'
					},120,function(){
						$(this).html(songs.votes[index]).animate({
							color: '#000000'
						},120);
					});
					
					var cHtml = $(vEl).html();
					var who = 'These people voted for this song today:';
					// who's voted?
					for(i=0;i<songs.voters[index].length;i++){
						who += "<span>" + songs.voters[index][i].name + " (" + songs.voters[index][i].count + "), </span>";
					}
					
					$(vEl).html(who);
					
				}
			});
			poll();
		});
	})();
});
