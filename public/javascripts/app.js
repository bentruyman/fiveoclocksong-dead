var App = {
	statusResponders: {},
	konamiPattern: "3838404037393739666513",
	konamiInput: "",
	timeout: null,
	boot: function () {
		this.setupPingResponder();
		this.setupAchievementListeners();
		this.setupPreviewPlayer();
		this.setupVoteResponder();
		this.setupStopPollResponder();
		this.setupStartPollResponder();
		this.setupMaxVotesResponder();
		
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
				//console.log(data.message);
			} catch (e) {
				// You ain't got no console
			}
		});
	},
	setupAchievementListeners: function () {
		// setup badges window
		$("#achievement, #achievements").hide();
		
		$("#userInfo").click(function(){
			if($("#achievements").css('display') === 'block'){
				$("#achievements").hide(400);
			}else{
				$("#achievements").show(400);
			}
		});

		// setup front side achievements listeners
		$(document).keydown(this.checkAchievement);
		$(document).click(this.checkAchievement);

		this.registerStatusResponder('achievement', function (data) {
			try {
				this.showAchievement(data);
			} catch (e) {
				// You ain't got no achievement
			}
		});
	},
	checkAchievement: function(ev){
		if(ev.keyCode !== 0){
			// key was pressed
			clearTimeout(App.timeout);

			// check for konami code
			App.konamiInput += ev.keyCode;
			
			if(App.konamiPattern === App.konamiInput){
				App.konamiInput = "";
				
				var opts = {
					element: "30_MANS"
				};
				
				App.sendAchievement(opts);
				
			}else if(App.konamiPattern.indexOf(App.konamiInput) === -1){
				App.konamiInput = "";
			}
			
			App.timeout = setTimeout(function(){
				App.konamiInput = "";
			},2500);
			
		}else{
		
			var hook = ev.originalEvent.srcElement.id;
			
			if(!hook){
				hook = ev.originalEvent.srcElement.className;
			}
			
			if(!hook){
				hook = ev.originalEvent.srcElement.offsetParent.className;
			}
			
			// elements to check against - ids and classNames here
			var classHooks = ['logo','creator','powered','unicorns','play_pause box'];
			
			if(classHooks.indexOf(hook) !== -1){

				switch(hook){
					case 'logo':
					
					break;
					case 'creator':
					
					break;
					case 'powered':
					
					break;
					case 'unicorns':
						var ff = $("#logo").css('fontFamily');
						if(ff.indexOf('Comic Sans MS') !== -1){
							var opts = {
								element: hook
							};
						}
					break;
					case 'play_pause box':
					
					break;
					default:
					
					break;
				}

				if(opts){
					
					App.sendAchievement(opts);

				}


				
			}
		}
		
	},
	sendAchievement: function(opts){
		$.getJSON('/achieve', opts, function (response) {
			console.log(response);
		});
	},
	setupStartPollResponder: function () {
		this.registerStatusResponder('startPoll', function (data) {
			// fade out site
			$("#winner").animate({
				opacity: 0
			}, 1000);

			// grab results page, remove old content, write new
			$.get('/',function(data) {
				var newContent = $(data).find("#songs").hide().get(0);
				$("#winner").replaceWith(newContent);
				$(newContent).fadeIn(500);
			});
		});
		
	},
	setupStopPollResponder: function() {
		this.registerStatusResponder('stopPoll', function (data) {
			// fade out site
			$("#songs").animate({
				opacity: 0
			}, 1000);

			// grab results page, remove old content, write new
			$.get('/',function(data) {
				var newContent = $(data).find("#winner").hide().get(0);
				$("#songs").replaceWith(newContent);
				$(newContent).fadeIn(500);
			});
		});
		
	},
	setupMaxVotesResponder: function(){
		$("#max").hide();
		var t;
		
		this.registerStatusResponder('maxVotes', function (data) {
			clearTimeout(t);
			
			$("#max").html(data);
			
			var lPos = ($(window).width() - $("#max").width()) / 2;
			var tPos = ($(window).height() - $("#max").height()) / 2;
			
			$("#max").css({
				left: lPos,
				top: tPos
			}).fadeIn(100);
			
			t = setTimeout(function(){
				$("#max").fadeOut(100);
			},2500);
			
		});
	},
	setupPreviewPlayer: function () {
		var currentlyPlaying,
			aEls = $("audio");

		// show controls once video is loaded.  This is indicated on first load via loadeddata event,
		// or, once cached, via canplaythrough event.  unbind these events after they fire to clean up.
		$(aEls).each(function () {
			
			var ppBox = $(".play_pause",$(this).parent());

			// only show player controls once the audio has been loaded
			$(ppBox).css({
				width: 0,
				right: 0
			});

			$(this).bind("loadedmetadata",function () {
				$(ppBox).animate({
					width: "115px",
					right: "115px"
				},200);
				$(this).unbind("loadedmetadata");
			}).bind("canplaythrough",function () {
				$(ppBox).animate({
					width: "115px",
					right: "115px"
				}, 200);
				$(this).unbind("canplaythrough");
			}).bind("ended",function () {
				// once play has ended, set the play button back to default, and rewind track
				$(this).addClass('pause');
				this.currentTime = 0;
				this.pause();
				
			});
						
		});

		$('#songs li').each(function (index, event) {
			var root = this;
			
			$('.play_pause', root).click(function (event) {
				event.preventDefault();
				//var audio = $('audio', root).get(0);
				var audios = $('audio');
				
				$(audios).each(function (i) {
					var button = $("span",$(this).parent());
					
					if (index == i) {
						
						if (this.paused) {
							$(button).addClass('pause');
							this.play();
						} else {
							$(button).removeClass('pause');
							this.pause();
							this.currentTime = 0;
						}
						
					} else {
						$(button).removeClass('pause');
						this.pause();
					}

				});
				
				
			});
		});
	},
	setupVoteResponder: function () {
		// $('marquee').marquee('voters'); Causing massive bugs in Chrome
				
		$('#songs .song').each(function (index) {
			$(this).mousedown(function (event) {
				event.preventDefault();
				$.post('/vote', {
					index: index
				});
			}).click(function (event) {
				event.preventDefault();
			}).bind("mouseenter",function(){
				$(".title",$(this)).append("<span class=\'hint\'> should win.</span>");
				
			}).bind("mouseleave",function(){
				$(".hint",$(this)).remove();
			});
		});

		$('#songs .votes').each(function (index) {
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
					var html = '';
					for (var i = 0, j = data.voters[index].length; i < j; i++) {
						html += '<span>' + data.voters[index][i].name + ' (' + data.voters[index][i].count + ')</span>';
					}
					$voters.html(html);
				}
			});
		});
	},
	showAchievement: function (data) {
		
		// populate achievement
		var cheevo = "<img src=\"/public/images/achievements/" + data.icon + "\" />";
		cheevo += "<div class=\"content\">";
		cheevo += "<div class=\"title\">" + data.friendly_name + "</div>";
		cheevo += "<div class=\"desc\">" + data.desc + "</div>";
		cheevo += "</div>";
		
		$("#achievement").html(cheevo);
		
		var lPos = ($(window).width() - $("#achievement").width()) / 2;
		
		var chirp = document.getElementById("chirp");
				
		chirp.play();
		
		$("#achievement").css({
			left: lPos,
			bottom: "50px"
		}).slideDown(200);
		
		t = setTimeout(function(){
			$("#achievement").slideUp(200);
			chirp.load();
		},4500);
		
		// update badges with unlocked achievement
		var hover = data.friendly_name + "\n\n" + data.desc;
		$("#ach-" + data.name).attr("src","/public/images/achievements/" + data.icon);
		$("#ach-" + data.name).attr("alt",hover);
		$("#ach-" + data.name).attr("title",hover);
		
	}
};

$(function () { App.boot(); });
