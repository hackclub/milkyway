<script>
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}


<style>
@font-face {
    font-family: "Futura";
    src: url("https://db.onlinewebfonts.com/t/0f56c874ba695191e7f4cab237447698.eot");
    src: url("https://db.onlinewebfonts.com/t/0f56c874ba695191e7f4cab237447698.eot?#iefix")format("embedded-opentype"),
    url("https://db.onlinewebfonts.com/t/0f56c874ba695191e7f4cab237447698.woff2")format("woff2"),
    url("https://db.onlinewebfonts.com/t/0f56c874ba695191e7f4cab237447698.woff")format("woff"),
    url("https://db.onlinewebfonts.com/t/0f56c874ba695191e7f4cab237447698.ttf")format("truetype"),
    url("https://db.onlinewebfonts.com/t/0f56c874ba695191e7f4cab237447698.svg#FuturaBT-Medium")format("svg");
    font-weight: 500;
    font-style: normal;
}

@font-face {
    font-family: "Futura";
    src: url("https://db.onlinewebfonts.com/t/6e07f140d506f85a74f04c232c559f8b.eot");
    src: url("https://db.onlinewebfonts.com/t/6e07f140d506f85a74f04c232c559f8b.eot?#iefix")format("embedded-opentype"),
    url("https://db.onlinewebfonts.com/t/6e07f140d506f85a74f04c232c559f8b.woff2")format("woff2"),
    url("https://db.onlinewebfonts.com/t/6e07f140d506f85a74f04c232c559f8b.woff")format("woff"),
    url("https://db.onlinewebfonts.com/t/6e07f140d506f85a74f04c232c559f8b.ttf")format("truetype"),
    url("https://db.onlinewebfonts.com/t/6e07f140d506f85a74f04c232c559f8b.svg#FuturaBT W02 Medium Italic")format("svg");
    font-weight: 500;
    font-style: italic;
}



@font-face {
  font-family: "Futura";
  src: url("/fonts/FuturaLT-Bold.woff") format("woff");
  font-weight: 800;
  font-style: normal;
}

@font-face {
  font-family: "Futura";
  src: url("/fonts/FuturaLT-BoldOblique.woff") format("woff");
  font-weight: 800;
  font-style: italic;
}


:global(:root){
	--orange: #F7C881;
	--yellow: #FBF2BF;
	--blue: #73ACE0;
}

:global(*) {
	box-sizing: border-box;
}


:global(body), :global(html) {
  margin: 0;
  padding: 0;
	width: 100%;
	height: 100%;
}

:global(html) {
	font-family: Futura, sans-serif;
	font-size: 1.2em;
}



</style>
