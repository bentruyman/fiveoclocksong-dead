var handle;

exports.init = function (providedHandle) {
	inspect('bandwagoner added');
	handle = providedHandle;
	handle.addListener('vote', check);
};

function check (payload) {

	var songs = handle.getData(payload.user, 'songs');

	if (!handle.isAchieved(payload.user)){
		if (typeof songs === 'undefined') {
			songs = {};
			songs[payload.song._id] = 1;
			inspect(songs);
			handle.setData(payload.user, 'songs', songs);
		} else {
			
			payload.poll.songs.forEach(function(item,index){

				item.voters.forEach(function(voter,i){

					if(voter.name === payload.user.name){

						if(i === 9){
							
							handle.setData(payload.user, 'songs', songs);
							handle.achieve(payload.user);
														
						}

					}

				});

			});
			
			
		}
	}

}
