var App = {
	statusResponders: {},
	boot: function () {
		this.setupPingResponder();
		this.setupPreviewPlayer();
		this.setupVoteResponder();

		this.poll();
	},
	poll:  function () {
		var self = this;

		$.getJSON('/status', function (response) {
			// Iterate through potential responders
			if (self.statusResponders[response.type]) {
				var responders = self.statusResponders[response.type];
				for (var i = 0, j = responders.length; i < j; i++) {
					responders[i].call(self, response.data);
				}
			}

			// Re-poll
			self.poll();
		});
	},
	registerStatusResponder: function (statusType, hollaback) {
		this.statusResponders[statusType] = this.statusResponders[statusType] || [];
		this.statusResponders[statusType].push(hollaback);
	},
	setupPingResponder: function () {
		this.registerStatusResponder('ping', function (data) {
			try {
				console.log(data.message);
			} catch (e) {
				// You ain't got no console
			}
		});
	},
	setupPreviewPlayer: function () {
		var currentlyPlaying 
		$('#songs li').each(function (event) {
			var root = this;
			$('.play_pause', root).click(function (event) {
				event.preventDefault();
				var audio = $('audio', root).get(0);
				audio.play();
			});
		});
	},
	setupVoteResponder: function () {
		$('#songs .voters').css('opacity', 0);

		$('#songs .votes').mouseenter(function () {
			var pos = $(this).position(),
				w = $(this).outerWidth();

			$(this).next().css({
				left: pos.left + w,
				top: '-5px'
			}).stop().animate({
				opacity: 1
			}, 150);
		}).mouseleave(function () {
			$(this).next().stop().animate({
				opacity: 0
			}, 150);
		});

		$('#songs .song').each(function (index) {
			$(this).mousedown(function (event) {
				event.preventDefault();
				$.post('/vote', {
					index: index
				});
			}).click(function (event) {
				event.preventDefault();
			});
		});

		this.registerStatusResponder('vote', function (data) {
			$('#songs li').each(function (index) {
				var $votes = $('.votes', this),
					$voters = $('.voters', this),
					oldValue = Number($votes.text()),
					newValue = data.votes[index];

				if (oldValue !== newValue) {
					// Update Vote Count
					if ($.browser.safari) {
						$votes.addClass('updated');
						setTimeout(function () {
							$votes.removeClass('updated');
							$votes.text(newValue);
						}, 250);
					} else {
						$votes.text(newValue);
					}

					// Update Voters
					var html = 'These people voted for this song today';
					for (var i = 0, j = data.voters[index].length; i < j; i++) {
						html += '<span>' + data.voters[index][i].name + '(' + data.voters[index][i].count + ')</span>';
					}
					$voters.html(html);
				}
			});
		});
	}
};

$(function () { App.boot(); });

// $(document).ready(function(){
// 	var flAudio = ({
// 		init: function(){
// 
// 			var params = {
// 				menu: "false",
// 				allowScriptAccess: "always"
// 			};
// 
// 			var flashvars = {};
// 			var attributes = {
// 				id:"fallback-player",
// 				name:"fallback-player"
// 			};
// 
// 			swfobject.embedSWF("/public/swf/player.swf", "fallback-player", "1", "1", "9.0.0","", flashvars, params, attributes);
// 
// 		},
// 		getFlashMovie: function(movieName){
// 			var isIE = navigator.appName.indexOf("Microsoft") != -1;
// 			return (isIE) ? window[movieName] : document[movieName];
// 		},
// 		loadSong: function(song){
// 			var player = this.getFlashMovie("fallback-player");
// 			player.loadSong(song);
// 		},
// 		pauseSong: function(){
// 			var player = this.getFlashMovie("fallback-player");
// 			player.pauseSong();
// 		},
// 		playSong: function(){
// 			var player = this.getFlashMovie("fallback-player");
// 			player.playSong();
// 		},
// 		flashMsg: function(msg){
// 			if($.browser.msie){
// 				alert("as: " + msg);
// 			}else{
// 				console.log("as: " + msg);
// 			}
// 		}
// 	});	
// 	

// 	
// 
// 
// });
