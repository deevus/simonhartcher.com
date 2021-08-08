{
	"slug": "xbox-media-centre-with-raspberry-pi",
	"title": "Xbox Media Centre with Raspberry Pi",
	"description": "Trying out three XBMC distributions",
	"date": "2013-09-30 00:17:46 +1000"
}

I have for a long while been interested in obtaining a [Raspberry Pi][pi] to do some experimenting on linux et al. As it turns out I had _mentioned this more than a couple_ of times to my partner, who suggested a Pi as a birthday present to her parents. It might have been 3 months after my birthday that I got the surprise from them, but you can't really blame them for the delay considering their shortage since release. Nevertheless, it is an awesome present for someone like myself. 

As an added bonus I also received a [PiFace][piface], which is a general purpose home-automation tool for the Pi. It sits directly on top of the board and gives you a decent amount of I/O to play with. At this point I haven't played at all with it, but I will be sure to cover anything on that front in the future.

[piface]: http://pi.cs.man.ac.uk/interface.htm

My Set-Up
----

Some things in this article are purely based on my set-up, and I haven't tried too hard for a general solution. So here's  a list of what I'm using:

- Sony Bravia 40" LCD TV
- [Onkyo TX-NR509][audio]
- [Raspberry Pi Model B][pi] (plugged into the Onkyo via HDMI)
- [Synology DS1812+][nas] (this is where my media is)

[audio]: http://www.intl.onkyo.com/products/av_components/av_receivers/tx-nr509/
[pi]: http://downloads.element14.com/raspberryPi3.html?COM=raspi-group
[nas]: http://www.synology.com/products/product.php?product_name=DS1812%2B&lang=us

As you can see it's not complicated. As long as you have a server/machine that supports Network File System (NFS) and the Raspberry Pi is on the network you'll be able to follow along for the most part.

Raspberry Pi as a Media Centre
----

There are already several media centre linux distributions using the Raspberry Pi such as [RaspBMC][rasp], [Xbian][xbian], [OpenELEC][elec] and [RasPlex][rasplex]. I have yet to try RasPlex (a [Plex][plex] Home Theatre port) but I have tried the other three in respective order.

[rasp]: http://www.raspbmc.com
[xbian]: http://www.xbian.org/
[elec]: http://openelec.tv/
[rasplex]: http://rasplex.com/
[plex]: http://www.plexapp.com/

So far all of the distributions I have tried have been very similar apart from some key details:

- RaspBMC and Xbian are both built on top of [Debian][7] and as such have powerful command line tools available for power users.
- OpenELEC is a distro built from scratch, and is mounted as a read-only filesystem (apart from user data). There are only very basic tools available on the command line.

[7]: http://www.debian.org/

They do however share the main functionality of [Xbox Media Centre (XBMC)][9] including [CEC][8], which is great for controlling it from my lounge without a keyboard and mouse, or a special bluetooth remote. For this to work in my set-up, I have HDMI pass-through enabled on the Onkyo, and Bravia Sync enabled on my TV (this is specific to the Sony Bravia range). Once that was set up it was plug-n-play. It lets me control the audio level of the receiver, and navigate XBMC with my TV remote. The only downside I have found so far, is that I haven't worked out a way to access the right-click menu using the remote.

[8]: http://wiki.xbmc.org/index.php?title=CEC
[9]: http://xbmc.org/

__1. [RaspBMC][rasp]__ (ssh: pi / raspberry)

This comes as part of the [NOOBS][9] recommended package as provided by the Raspberry Pi foundation, and was the first one that I tried. 

[10]: http://www.raspberrypi.org/downloads

It worked as advertised, but was noticeably laggy when navigating the menus. After several days of usage I was greeted with a frozen XBMC and I was unable to ssh into it anymore after several reboots. At this point I decided to give another distro a go.

__2. [Xbian][xbian]__ (ssh: xbian / raspberry)

Xbian advertises itself as being a very fast XBMC package, and straight out of the box, it is. The menus are snappy, and the boot time is fair. There was a noticeable lag when starting a video, but this may have been due to my using the [samba protocol][samba] for network streaming at this point. 

[samba]: http://en.wikipedia.org/wiki/Samba_(software)

Once I installed a few add-ons that I wanted (Xbian comes only with a basic set of add-ons), I noticed that the lag was similar to that of RaspBMC. And, once I configured library updates on start-up (Settings -> System), it was barely usable on reboot until the update daemon had finished, even when there were no changes to make.

I was going to change the network shares to use NFS to see how this affected browsing and video load times, but after a reboot Xbian failed to boot up, and I wasn't able to get it to come back after many tries. So at this point I moved on to...

__3. [OpenELEC][elec]__ (ssh: root / openelec)

For whatever reason, RaspBMC and Xbian somehow were corrupting themselves. As far as I can tell, I wasn't doing anything toxic to them via ssh, so the idea that OpenELEC is a read-only system (and anything I may have broken one boot would be fixed the next) certainly appealed to me.

Unique in comparison to the others, OpenELEC was the only one to have a nice GUI wizard on first start inside XBMC to set up network and other options. This was a clear winner in terms of getting going, as you can set up ssh and samba access with ease. 

I had read elsewhere that Xbian was the fastest of the three that I tried, but to me OpenELEC seemed the clear winner. As previously mentioned I had Xbian network shares set up using samba, but due to bricking itself it never got the chance to try NFS. Once I had set up the NFS mounts using ssh, and added them to sources in XBMC, I was golden. 

To add the NFS mounts on start-up, you need to edit/create `autostart.sh` using the Configfiles share (samba) and add the following:

`#!/bin/sh
(sleep 30; \
	mount -t nfs server_name_or_ip:/path/to/share1 /storage/share1 -o nolock; \
	mount -t nfs server_name_or_ip:/path/to/share2 /storage/share2 -o nolock; \
)&`

Please note that the paths must exist on the Pi for the mount to work. For Windows you will need to use samba which is covered on the OpenELEC wiki page [mounting network shares][cifs].

[cifs]: http://wiki.openelec.tv/index.php?title=Mounting_network_shares

Once this is set-up you can configure XBMC to your liking and you're on your way. However, I do suggest having some way to automatically update your library when you add new videos. Personally, I have [Sick Beard][sb] and [Couch Potato][cp] running on my NAS which sends update commands when a video is processed, but you can just configure XBMC to update on start-up, or install the [Watchdog add-on][wd] which updates when changes are detected.

Final Thoughts
----

There seems to be a lot of conflicting information regarding which distro is the best, with my own opinions included. I think that each has its merits and its quite possible that I may switch back to another in future and find that it has improved significantly. 

There seems to be a few things at play here that could greatly affect the perceived performance:

- Is your media networked, or local via a usb external drive?
- If it is networked, is it gigabit?
- How good is your SD card? There are faster, more expensive ones available than what I have. I have an 80MB/s one on order, so I will report back on whether this helps later.
- How big is your library? Mine is 9TB currently, so this would affect database loading times when browsing. This may be improved greatly when I get the new SD card that I just mentioned. 

It's still early days really, and when I think about it OpenELEC has been the most reliable, with the added benefit of acceptable performance. It has not crashed while the other two did with the same library, add-ons and configuration. You might have to try more than one distribution before you find the right one for you, based on your own circumstances. 

[sb]: http://sickbeard.com/
[cp]: https://couchpota.to/
[wd]: http://wiki.xbmc.org/index.php?title=Add-on:Watchdog