var App = {
	statusResponders: {},
	boot: function () {
		this.setupPingResponder();
		this.setupPreviewPlayer();
		this.setupSongRollovers();
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
		
	},
	setupSongRollovers: function () {
		$('#songs a').each(function (index) {
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

		$('#songs a').each(function (index) {
			$(this).click(function (event) {
				event.preventDefault();
				$.post('/vote', {
					index: index
				});
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
					$votes.animate({
						color: '#ffffff'
					}, 150, function () {
						$votes.text(newValue).animate({
							color: '#000000'
						}, 150);
					});

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
