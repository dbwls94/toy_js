const calendar = (cur_year, cur_month) => {
	let d = new Date(cur_year, cur_month, 1);
	let year = d.getFullYear();
	let month = d.getMonth();
	let date = d.getDate();
	let day = d.getDay();

	const caption_year = document.getElementsByClassName('year')[0];
	const caption_month = document.getElementsByClassName('month')[0];
	const td_date = document.querySelectorAll('tr td');
	const date_length = 32 - new Date(year, month, 32).getDate();

	caption_year.innerHTML = year;
	caption_month.innerHTML = month+1;

	for(let i = 0; i < td_date.length; i++) {
		td_date[i].innerHTML = '&nbsp;';
	}

	for(let i = day; i < day+date_length; i++) {
		td_date[i].innerHTML = date;
		date++;
	}
}

(function(){
	let prev = document.getElementById('prev');
	let next = document.getElementById('next');
	let cur_year = new Date().getFullYear();
	let cur_month = new Date().getMonth();

	calendar(cur_year, cur_month);

	prev.addEventListener('click', () => {
		calendar(cur_year, --cur_month); // cur_month-1을 하게되면, 이전의 cur_month 변수 값 자체를 변화시키는게 아니다. 그래서 변수 자체의 값을 증감시키기 위해 증감연산자 사용
		console.log(cur_month+1);
	});

	next.addEventListener('click', () => {
		calendar(cur_year, ++cur_month);
		console.log(cur_month+1);
	});
})();