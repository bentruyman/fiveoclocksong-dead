var session;

exports.init = function(s){
	
	inspect('Test Achievement added');
	
};

exports.event = 'vote';

exports.check = function(options){

	inspect("check achievement: test");
	//inspect(options);

	//inspect(self.songs[options.index].voters);

	var condition;
	
	self.songs[options.index].voters.forEach(function(item,i){
		
		if(item.name === options.session.name){
			
			if(item.count === 5){
				condition = true;
			}else{
				condition = false;
			}
			
		}
		
	});
	
	return condition;
	
};


