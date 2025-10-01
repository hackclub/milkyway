
export function getCurrentRound(){
  return 4;
}



export const choices = {
    "camera": {
        "2d top down": {
            "description": "like you're looking straight down. usually the player moves in 4- or 8- directions.",
            "examples": {
                "stardew valley": "https://assets.nintendo.com/image/upload/ar_16:9,b_auto:border,c_lpad/b_white/f_auto/q_auto/dpr_1.5/c_scale,w_500/ncom/software/switch/70010000001801/6016d2f6d874ad4a1063a28181597427f6fe9ee207ce3c8351c10dda377b3bb4",
                "snake": "https://www.snakegame.net/media/google-snake-game.png",
                "undertale": "https://assets.nintendo.com/image/upload/ar_16:9,b_auto:border,c_lpad/b_white/f_auto/q_auto/dpr_1.5/c_scale,w_500/ncom/software/switch/70010000009921/0a9194c2df87a1a28b9b55dea51f52089bb35f0b72e4f9f9d8cec4689e4e99af",
                "the binding of isaac": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/113200/ss_d2dd031f581bcad380ed5a6065c8908329cf1115.1920x1080.jpg?t=1643480517"
            }
        },
        "2d side scrolling": {
            "description": "viewing the action from the side. player usually moves left/right and jumps.",
            "examples": {
                "hollow knight": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/367520/ss_47f3523dbea462aff2ca4bc9f605faaf80a792b2.1920x1080.jpg?t=1695270428",
                "celeste": "https://www.syfy.com/sites/syfy/files/styles/scale_862/public/3344817-celeste_1.jpg",
                "terraria": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/105600/ss_8c03886f214d2108cafca13845533eaa3d87d83f.1920x1080.jpg?t=1731252354",
                "super mario bros": "https://www.nintendo.com/eu/media/images/10_share_images/games_15/virtual_console_nintendo_3ds_7/SI_3DSVC_SuperMarioBros.jpg"
            }
        },
        "2d isometric": {
            "description": "angled view where you see two vertical sides of the environment. can be in 2d or 3d.",
            "examples": {
                "hades": "https://assets1.ignimgs.com/2020/09/29/switch-hades-screenshot-3-1601347618169.jpg",
                "rollercoaster tycoon classic": "https://assets.nintendo.com/image/upload/q_auto:best/f_auto/dpr_2.0/ncom/software/switch/70010000088763/b54b376160b3e4b69c91517cb5d32d21393ac65e7500413d9b3a5ee9a0bec054",
                "bastion": "https://assets.nintendo.com/image/upload/q_auto:best/f_auto/dpr_2.0/ncom/software/switch/70010000010936/e8be9269e8c56b0378da18cf3747add3de1d4369cc3c91ed81d0584a8e156373",
                "monument valley": "https://blog.richersounds.com/wp-content/uploads/2022/10/MV_FS_Thief.0.0.jpeg"
            }
        },
        "3d first person": {
            "description": "the camera sees the world from the character's point of view.",
            "examples": {
                "minecraft": "https://minecraft.wiki/images/thumb/Survival.png/427px-Survival.png?b8898",
                "portal": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/400/0000002586.1920x1080.jpg?t=1745368554",
                "slime rancher": "https://www.cyberpowerpc.com/blog/w/wp-content/uploads/2016/04/ss_ff0317116fc7f39aa3279637523d68920eb243d8.1920x1080.jpg",
                "subnautica": "https://i.ytimg.com/vi/QQUBLtRcYPA/maxresdefault.jpg"
            }
        },
        "3d third person": {
            "description": "the camera follows a character.",
            "examples": {
                "journey": "https://lh3.googleusercontent.com/btaPEE89l95SeM_ihzqMSHNSID1ASUgiG41Ml64uCKbi4LtM1fzAB4s0klihVMHM8OJS1zrHxSVv44OFYbcGmnWo3TOV7CEbYa0lwBw6h_p3icp4focP0ur-2mJcdJwdSyILOk0",
                "a short hike": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1055540/ss_4c7c9650606ac7b451f8d2e5b71b503649e43edc.1920x1080.jpg?t=1734538147",
                "psychonauts": "https://i.ytimg.com/vi/RLDoys8ahOI/maxresdefault.jpg",
                "it takes two": "https://i.ytimg.com/vi/sW-lpUtSGdo/maxresdefault.jpg"
            }
        },
        "2.5d": {
            "description": "gameplay is mostly 2d, but uses 3d models/depth effects.",
            "examples": {
                "cult of the lamb": "https://cdn.dlcompare.com/others_jpg/upload/news/image/cult-of-the-lamb-gameplay-guide-image-ef493a14.jpeg.webp",
                "animal crossing": "https://static1.polygonimages.com/wordpress/wp-content/uploads/chorus/uploads/chorus_asset/file/16342471/Switch_AnimalCrossingNH_E3_screen_07.jpg",
                "little nightmares": "https://i.ytimg.com/vi/kvhI27s8gL8/maxresdefault.jpg",
                "octopath traveller": "https://d.player.one/en/full/215069/square-enix-has-shown-off-20-minutes-new-gameplay-footage-octopath-traveler-ii.jpg?w=1600&h=1200&q=88&f=3a3e0d0cbc4e77b919d0e20e82d57b7e"
            }
        },
        "interface-based": {
            "description": "no world camera - play through menus, buttons, and ui screens.",
            "examples": {
                "balatro": "https://i.guim.co.uk/img/media/6e67f271b1a0a0cc29c4b99e97d5f49dfcde446c/0_19_1719_1031/master/1719.jpg?width=700&quality=85&auto=format&fit=max&s=a40e6a43e38df7aa2bc5fa1dce430ed5",
                "papers, please": "https://media.npr.org/assets/img/2013/11/11/shot05-brothel_wide-3c71f72d1d1c2e9442823b9d53dfcc8a5110b993.png?s=1400&c=100&f=png",
                "osu": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRvN3-kgubLZeLSc0mjwfYVlF0g1kEly5W9nw&s",
                "mini metro": "https://play-lh.googleusercontent.com/Y_QtZy3w7MXM9J5olgQR2t3BeYfrFS-8bsT9T20u5vkOXMQUtJkaa2hM9cqrFMXJ7g=w526-h296-rw"
            }
        }
    },
    "gameplay": {
        "puzzle": {
            "description": "solve problems using logic or pattern-recognition to progress.",
            "examples": {
              "baba is you": "https://static1.polygonimages.com/wordpress/wp-content/uploads/chorus/uploads/chorus_asset/file/15957572/D1fY__nUYAAVQ_3.jpg",
              "portal": "https://levelsandgear.files.wordpress.com/2010/05/portal4dimensionsno3.jpg",
              "superliminal": "https://static.prod.thinkygames.com/uploads/screenshots/117ec8de-7592-466a-8c42-964ca7117cb2/0bc37cbf-f778-405d-aef4-83348b1b6b30-960x540.jpg",
              "the witness": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTHokQViLhBsMaK5Xc_iXHThrvu9dYHPOSrBA&s"
            }
        },
        "platformer": {
            "description": "navigate through platforms and obstacles to progress.",
            "examples": {
              "celeste": "https://www.celestegame.com/images/screenshots/05.png",
              "ori and the blind forest": "https://epiloguegaming.files.wordpress.com/2017/05/4nrqr7c.jpg?resize=2560%2C1440",
              "super meat boy": "https://thegemsbok.com/wp-content/uploads/2022/06/Super-Meat-Boy-Forever-screenshot-with-Meat-Boy-in-Chipper-Grove-Light-World.png",
              "super mario bros": "https://hips.hearstapps.com/digitalspyuk.cdnds.net/12/48/gaming-super-mario-bros-3.jpg"
            }
        },
        "arcade": {
            "description": "typically in rounds or waves, use quick reflexes and hit high scores.",
            "examples": {
              "pacman": "https://thereader.mitpress.mit.edu/wp-content/uploads/2020/11/pacman-lead-graphic.jpg",
              "slither.io": "https://play-lh.googleusercontent.com/h2s7S6so1J7slT56mf56s_ckxDEkFYWT4A0mi6mfGFj_YNAfWids0hekOKAwHXAZ8g=w526-h296-rw",
              "street fighter 6": "https://i0.wp.com/waytoomany.games/wp-content/uploads/2023/06/20230607123056_1.jpg?ssl=1",
              "tetris 99": "https://assets.nintendo.com/image/upload/ar_16:9,b_auto:border,c_lpad/b_white/f_auto/q_auto/dpr_1.5/c_scale,w_500/ncom/software/switch/70010000018547/09a86db6b2399856413919ee25fdffaa4b094c21d142aa0489eb75e45c3d7e86"
            }
        },
        "rhythm": {
            "description": "use rhythm or music-based inputs, such as being on beat or on tune.",
            "examples": {
              "beat saber": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/620980/ss_1881ae4f153faf0d1ccecca60fbdac5b43ad57eb.1920x1080.jpg?t=1749135147",
              "taiko": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2288630/ss_239db8182d082194a71619da2edb622f89bd1794.1920x1080.jpg?t=1754517684",
              "osu": "https://flathub.org/_next/image?url=https%3A%2F%2Fdl.flathub.org%2Fmedia%2Fsh%2Fppy%2Fosu%2F8fa4ebef7ac7c85c50f8813a66072ebd%2Fscreenshots%2Fimage-3_orig.webp&w=3840&q=75",
              "melatonin": "https://i.ytimg.com/vi/Wmjks5xI-yg/maxresdefault.jpg"
            }
        },
        "story-based": {
            "description": "rpg/visual novel/quest-centric games that emphasize the narrative or character development.",
            "examples": {
              "night in the woods": "https://finji.co/assets/images/nitwscreenshot4.jpg",
              "life is strange": "https://cdn.mos.cms.futurecdn.net/2e60b685560d01a1edad429351ad761e.png",
              "butterfly soup": "https://img.itch.zone/aW1hZ2UvMTQzODk5LzgyNjc1MC5wbmc=/original/T0ZSUO.png",
              "disco elysium": "https://i.pcmag.com/imagery/reviews/06KO3v73syjD6Vb9NAYFvJE-1..v1617757296.jpg"
            }
        },
        "survival": {
            "description": "collect resources, explore, and stay alive!",
            "examples": {
              "don't starve": "https://www.thespectrum.com/gcdn/-mm-/ef7d9320c68b1ee58113e3e2afb475ca85dd5bbe/c=5-0-2203-1242/local/-/media/2016/12/28/StGeorge/StGeorge/636185324085103973-Don-t-Starve--Shipwrecked-photo-1.png?width=1600&height=800&fit=crop&format=pjpg&auto=webp",
              "subnautica": "https://i.guim.co.uk/img/media/c3fa594c48c79858c697868bc023ada2294d38fd/165_0_3600_2160/master/3600.jpg?width=1200&quality=85&auto=format&fit=max&s=fc4660d349b436f326041549b9c896fd",
              "minecraft": "https://terracoders.com/sites/default/files/inline-images/MC.png",
              "raft": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/648800/ss_fddb32f91f59dc076b60eebf6d013fc9a636e0e1.1920x1080.jpg?t=1727184011"
            }
        },
        "management": {
            "description": "manage your inventory, resources, people, or systems effectively.",
            "examples": {
              "stardew valley": "https://storyblok.shockbyte.com/f/296405/1280x720/bf2492a65c/stardew-valley-server-hosting.webp/m/2560x0",
              "spiritfarer": "https://clarafv.com/wp-content/uploads/2021/02/spiritfarer-screenshots-03.png",
              "factorio": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSBLG04AQBH7xQjazxc1ur3n1BvoIfhuZR7rQ&s",
              "mini motorways": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1127500/ss_9c2854c0af54f9512d5d480a2fdaa547f6ab876e.1920x1080.jpg?t=1667780984"
            }
        },
        "combat": {
            "description": "fight and battle!",
            "examples": {
              "dead cells": "https://play-lh.googleusercontent.com/mo0CZaV_aGflOPB8Tzo697l1WoZuoYUN9TiPMWq0zE29v_I99n1Qg185MfHrU-53nxAG=w526-h296-rw",
              "hades": "https://assets1.ignimgs.com/2020/09/29/switch-hades-screenshot-3-1601347618169.jpg",
              "hyper light drifter": "https://i.ytimg.com/vi/qqZZ52tGtdY/maxresdefault.jpg",
              "katana zero": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/460950/ss_fce2aae6d24fbca70a8196e04f66c51d49a353b0.1920x1080.jpg?t=1719982207"
            }
        },
        "stealth": {
            "description": "be sneaky and avoid detection.",
            "examples": {
              "mark of the ninja": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/214560/ss_e0e5bff3ff1aa40dd71296ca9becf8279910da2b.1920x1080.jpg?t=1668892924",
              "invisible. inc": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/243970/ss_33c9bdeb0dcbc64c6699e4375e591f7ab3c94ce3.1920x1080.jpg?t=1738778734",
              "the marvellous miss take": "https://cdn.mos.cms.futurecdn.net/390e337fbf11aa174b46aada68212b65.png",
              "heat signature": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/268130/ss_e33b87b6ad40870378169086b28923ddae2e33ee.1920x1080.jpg?t=1727717430"
            }
        },
        "exploration": {
            "description": "usually open-world, explore and discover new things!",
            "examples": {
              "journey": "https://i.guim.co.uk/img/static/sys-images/Technology/Pix/pictures/2012/1/4/1325670126413/Journey-007.jpg?width=465&dpr=1&s=none&crop=none",
              "outer wilds": "https://www.pluggedin.com/wp-content/uploads/2020/01/Outer_Wilds_Large-1024x587.jpg",
              "eastshade": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS_t2hrxvJFNmxtF_8vYDEFMMl4zPFr4PUUFg&s",
              "a short hike": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1055540/ss_f2123fea859e299736a3e99d130238c784d53e75.1920x1080.jpg?t=1734538147"
            }
        },
        "deckbuilder": {
            "description": "build and customise a deck of cards — then use those cards to progress.",
            "examples": {
              "balatro": "https://gaming-cdn.com/images/news/articles/10608/cover/1000x563/balatro-announces-a-big-update-for-this-year-cover67a6814d03867.jpg",
              "slay the spire": "https://play-lh.googleusercontent.com/DNyJi9sVxrrpkYoFrZEq4yieQGG4RJJYQ_Mz_rmlv1gtAexMY60eUjLcalnvlrc3ng=w526-h296-rw",
              "dicey dungeons": "https://static.prod.thinkygames.com/uploads/screenshots/110b81bc-d717-48d4-b160-7d1afd0a561a/3a7ee8b3-3b40-4044-ac7b-032c3f087643-960x540.jpg",
              "inscryption": "https://images.kinguin.net/g/carousel-main-mobile/media/images/products/61707ea80bd63c0001627e52_bff41e398eef6cd534c5800ffd2b5430.jpg"
            }
        },
        "clicker": {
            "description": "repeat actions (usually via clicking) to progress the game",
            "examples": {
              "cookie clicker": "https://static.wikia.nocookie.net/cookieclicker/images/4/41/Bakery.png.png/revision/latest/scale-to-width-down/1919?cb=20241105192506",
              "egg inc": "https://i.imgur.com/dlzBtAU.jpg",
              "adventure capitalist": "https://eip.gg/wp-content/uploads/2020/01/adventure-capitalist-gameplay-screenshot-e1475648785365.jpg.webp",
              "realm grinder": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/610080/ss_4cdba2a18f906ccb1746548d6378f682de6fc34a.1920x1080.jpg?t=1592248284"
            }
        }
    },
    "setting": {
        "nature": {
            "description": "wild nature and landscapes — think forests, mountains, beaches.",
            "examples": {
              "terraria": "https://i.ytimg.com/vi/90dpX0ndteg/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLDqyOYZTVeq6TmAvqLqGIVGweCVWQ",
              "a short hike": "https://www.heypoorplayer.com/wp-content/uploads/2020/07/highres1.png",
              "don't starve": "https://lh3.googleusercontent.com/YflCdv6q_V1tZV3K-jiOhGE9FRTl_434nuxn2HkNC-3KbQ1ZI05qBQfOSbvDpFWxGKACz4H4VB_-oi_qq_rcFcXYh3MO3MOjljpxbK3PjGOyRWCVJ1Kr8_rYpERu4w",
              "celeste": "https://eegamesmart.co.uk/g/s/2171/celeste_2171.jpg"
            }
        },
        "urban": {
            "description": "a setting in a town, city, or otherwise urban environment. buildings!",
            "examples": {
              "gang beasts": "https://images.igdb.com/igdb/image/upload/t_original/vbxzn6lzpc8ggwrdnv1a.png",
              "overcooked": "https://cdn2.unrealengine.com/Diesel%2Fproduct%2Fovercooked%2Fhome%2FKitchen1-1920x1080-aeb19d379c9d394479acdbdbfc7ae0335bda83fe.jpg",
              "night in the woods": "https://oberlinreview.org/wp-content/uploads/2017/03/Game-Image-by-Avi-Vogel-WEB-900x506.jpg",
              "stardew valley": "https://www.allkeyshop.com/blog/wp-content/uploads/Stardew-Valley-Sells-41-Million-Copies-1024x536.webp"
            }
        },
        "futuristic": {
            "description": "high-tech worlds of advanced science - scifi, cyberpunk, space.",
            "examples": {
              "katana zero": "https://cdn.wccftech.com/wp-content/uploads/2025/04/Katana-Zero-DLC-1456x819.jpg",
              "outer wilds": "https://www.pluggedin.com/wp-content/uploads/2020/01/Outer_Wilds_Large-1024x587.jpg",
              "hyper light drifter": "https://i.ytimg.com/vi/qqZZ52tGtdY/maxresdefault.jpg",
              "echo": "https://i.ytimg.com/vi/T5XBjnLKEw0/maxresdefault.jpg"
            }
        },
        "dystopian": {
            "description": "post-apocalyptic or dystopian.",
            "examples": {
              "rain world": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRvh4Vy-C453RfPDsdyBMbvH8EHQ_U4E_Nm1WoRpk4HmB_3YlFRP78kSOQN_XeY87itE84&usqp=CAU",
              "death stranding": "https://cdn.shopify.com/s/files/1/1212/8002/products/35-lakeknot-center_f34b1607-53a5-4859-8425-bb043f0e1d3b.jpg?v=1650613556",
              "ashen": "https://assets1.ignimgs.com/thumbs/2019/12/10/3-c7201392e7cd0dd873fe7767cc836c3c-1575995416/frame_0001.jpg",
              "frostpunk": "https://images-rsg.storage.googleapis.com/wp-content/uploads/2024/10/City-Building-in-Frostpunk-2.jpg"
            }
        },
        "surreal": {
            "description": "slightly bizzare and dreamlike and strange. a little unexpected.",
            "examples": {
              "superliminal": "https://www.washingtonpost.com/wp-apps/imrs.php?src=https://arc-anglerfish-washpost-prod-washpost.s3.amazonaws.com/public/7GYKMHT4SZB63FJ5YLCPBY7SAY.jpg&w=800&h=600",
              "viewfinder": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1382070/ss_9c9a0cdfda4c09caa0e01db6d78dbafcae657291.1920x1080.jpg?t=1752754630",
              "antichamber": "https://pixelblogpost.wordpress.com/wp-content/uploads/2014/03/the-game-is-unlike-anything-youve-ever-seen.png",
              "baba is you": "https://play-lh.googleusercontent.com/ZWejQHB_ihAyynSl4BF3BYRNNkNmCtqDvROv_hZI0RS1gykfFBWYhk-3Wj2xHHEec2k=w526-h296-rw"
            }
        },
        "digital": {
            "description": "environments inside computers or simulated realities.",
            "examples": {
              "oneshot": "https://nintendoeverything.com/wp-content/uploads/OneShot-World-Machine-Edition-gameplay.jpg",
              "trombone champ": "https://images.axios.com/z8-oLe0B3Qj5eYLHJb-9eLtX_4E=/2022/10/16/1665952378053.jpg",
              "hypnospace outlaw": "https://assets.nintendo.com/image/upload/q_auto:best/f_auto/dpr_2.0/ncom/software/switch/70010000027941/c4c87f50eb5666c449e3c09bfcd28681b45d1dae8c8fa779dd2d59b5a1180433",
              "main frames": "https://platform.theverge.com/wp-content/uploads/sites/2/2025/02/ss_e2538881d058e018c9b3c14c0039c6d44fb3618a.jpg?quality=90&strip=all&crop=7.8125,0,84.375,100"
            }
        },
        "fantasy": {
            "description": "magical realms, mythical creatures, maybe magic!",
            "examples": {
              "gris": "https://colourmeread.com/wp-content/uploads/2022/03/gris-yellow.jpg",
              "wandersong": "https://gaming-age.com/wp-content/uploads/2018/10/wandersong-2.jpg",
              "hollow knight": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRGUFWTL6-k_BOJrvMzj3bQ60phj9aExYf3IQ&s",
              "tunic": "https://assets.nintendo.com/image/upload/ar_16:9,b_auto:border,c_lpad/b_white/f_auto/q_auto/dpr_1.5/c_scale,w_500/ncom/software/switch/70010000045589/5b4ab632c1ef7a39cc763615163fa025a94d16f9e4a799148a1274dfcd9320f9"
            }
        },
        "non-world": {
            "description": "a blank box, or abstract and geometric.",
            "examples": {
              "geometry dash": "https://m.media-amazon.com/images/I/A1xBx7dAE1L.png",
              "mini metro": 'https://dinopoloclub.com/wp-content/uploads/2023/12/Miniversary_Warsaw-1.png',
              "beat saber": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/620980/ss_1881ae4f153faf0d1ccecca60fbdac5b43ad57eb.1920x1080.jpg?t=1749135147",
              "puyo puyo tetris": "https://ztgd.com/wp-content/uploads/2017/05/puyopuyotetris_07.jpg"
            }
        }
    }
}


export const prizes = [
  
]



export function isSelectedCountOk(selectedOptions, wheelOption) {
  const wheelChoices = choices[wheelOption];
  if (!wheelChoices) return false;
  const totalCount = Array.isArray(wheelChoices)
    ? wheelChoices.length
    : Object.keys(wheelChoices).length;

  const limit = Math.ceil(0.33 * totalCount);
  const totalLeft = totalCount - limit;

  return selectedOptions.length >= totalLeft;
}

export function areSelectedOptionsValid(selectedOptions, wheelOption) {
  const wheelChoices = choices[wheelOption];
  if (!wheelChoices) return false;

  const validSet = new Set(
    Array.isArray(wheelChoices) ? wheelChoices : Object.keys(wheelChoices)
  );

  // Every selected option must exist in the valid set
  return Array.isArray(selectedOptions) && selectedOptions.every(opt => validSet.has(opt));
}
