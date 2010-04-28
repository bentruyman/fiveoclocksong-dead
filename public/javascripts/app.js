$(function(){
	$('#songs a').each(function (index) {
		$(this).click(function (event) {
			event.preventDefault();
			$.post('/vote', {
				index: index
			});
		});
	});

	// Longpoll
	(function poll(){
		$.getJSON('/songs', function (songs) {
			$('#songs a').each(function (index) {
				$('.votes', this).html(songs[index]);
			});
			poll();
		});
	})();
});