const imgs = document.getElementsByClassName('thumb');
const lightbox = document.getElementById('lightbox');
const showImgs = lightbox.querySelectorAll('figure > img');
const dimmedBox = document.getElementById('block');
const btnImg = document.querySelectorAll('.indicator > button');
const btnClose = document.getElementsByClassName('btn-close');

const openLightBox = (index) => {
    lightbox.setAttribute('class', 'active');
    dimmedBox.setAttribute('class', 'active');

    for(let i=0; i<showImgs.length; i++) {
        showImgs[i].removeAttribute('class');
    }

    showImgs[index].setAttribute('class', 'active');
    btnImg[index].focus();
};

btnClose[0].addEventListener('click', () => {
    lightbox.removeAttribute('class');
    dimmedBox.removeAttribute('class');
});

const changeImg = (index) => {
    for(let i=0; i<showImgs.length; i++) {
        showImgs[i].removeAttribute('class');
    }
    
    showImgs[index].setAttribute('class', 'active');
};

for(let i=0; i<imgs.length; i++) {
    imgs[i].addEventListener('click', () => {
        openLightBox(i);
    });
}

for(let i=0; i<btnImg.length; i++) {
    btnImg[i].addEventListener('click', () => {
        changeImg(i);
    });
}