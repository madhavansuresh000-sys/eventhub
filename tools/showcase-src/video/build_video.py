"""EventHub demo video: Tamil narration (edge-tts neural voice) + English subtitles burned into the picture.
Each sentence = one audio clip + one frame (scene image + its English subtitle). Output: MP4 + SRT + script.md."""
import asyncio, os, subprocess, textwrap, wave, json
import edge_tts, imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS = r'D:\Java_FullStack_Journey\02_EventHub_Practice_Project\Showcase\screenshots'
SLIDES = os.path.join(HERE, '..', 'deck', 'render')
OUT_DIR = os.path.join(HERE, os.environ.get('BUILD_DIR', 'build'))
os.makedirs(OUT_DIR, exist_ok=True)
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
VOICE = os.environ.get('VOICE', 'ta-IN-ValluvarNeural')
RATE = os.environ.get('RATE', '-8%')
PITCH = os.environ.get('PITCH', '+0Hz')
# extra sound filter, e.g. a higher cartoon pitch: asetrate=44100*1.28,aresample=44100,atempo=0.86
AFILTER = os.environ.get('AFILTER', '')
PAUSE = 0.45  # seconds of silence after each sentence

# (image, [(tamil, english), ...])
SCENES = [
    ('slide:s01', [
        ('வணக்கம்! என் பெயர் மாதவன். இன்று என் project EventHub-ஐ உங்களுக்குக் காட்டப் போகிறேன்.', 'Hello! My name is Madhavan. Today I will show you my project, EventHub.'),
        ('EventHub என்பது ஒரு college-இன் எல்லா events-ஐயும் ஒரே இடத்தில் நடத்தும் ஒரு website.', "EventHub is a website that runs all of a college's events in one place."),
        ('இதை React, Spring Boot, MySQL பயன்படுத்தி உருவாக்கினேன்.', 'I built it with React, Spring Boot and MySQL.'),
    ]),
    ('slide:s02', [
        ('இன்று பல college-களில் events, WhatsApp group-களிலும் Google Form-களிலும் நடத்தப்படுகின்றன.', 'Today, many colleges run events on WhatsApp groups and Google Forms.'),
        ('இதனால் கடைசி seat-க்கு இரண்டு பேர் book செய்வது, ticket screenshot பகிர்வது, தாமதமான certificate போன்ற பிரச்சனைகள் வருகின்றன.', 'This causes problems: two people booking the last seat, shared ticket screenshots and late certificates.'),
        ('EventHub, இந்த ஒவ்வொரு பிரச்சனைக்கும் server-இல் ஒரு விதியின் மூலம் தீர்வு தருகிறது.', 'EventHub solves each of these problems with a rule on the server.'),
    ]),
    ('slide:s04', [
        ('இதில் ஐந்து வகையான பயனர்கள் இருக்கிறார்கள்: visitor, student, organizer, volunteer, admin.', 'There are five kinds of users: visitor, student, organizer, volunteer and admin.'),
        ('ஒவ்வொரு request-இலும், பயனரின் role-ஐ server சரிபார்க்கிறது.', "The server checks the user's role on every request."),
    ]),
    ('slide:s07', [
        ('Browser-இல் React app ஓடுகிறது. அது JSON மூலம் Spring Boot server-உடன் பேசுகிறது.', 'The React app runs in the browser. It talks to the Spring Boot server using JSON.'),
        ('ஒவ்வொரு request-உம் security filter, controller, service, repository வழியாக MySQL database-ஐ அடைகிறது.', 'Each request goes through the security filters, the controller, the service and the repository to reach MySQL.'),
    ]),
    ('shot:01-home', [
        ('இது home page. Student ஒரு event-ஐ search செய்யலாம், அல்லது ஒரு tag-ஐ click செய்யலாம்.', 'This is the home page. A student can search for an event or click a tag.'),
    ]),
    ('shot:05-event-details', [
        ('Event page-இல் விலையும், எத்தனை seats மீதம் உள்ளன என்பதும் நேரடியாகத் தெரியும்.', 'The event page shows the price and how many seats are left, live.'),
        ('ரவி ஒரு ticket தேர்வு செய்து, Book now அழுத்துகிறார்.', 'Ravi chooses one ticket and presses Book now.'),
    ]),
    ('shot:07-checkout-hold', [
        ('அவர் பணம் செலுத்தும் வரை, அந்த seat பத்து நிமிடங்கள் அவருக்காக வைக்கப்படுகிறது.', 'While he pays, the seat is kept for him for ten minutes.'),
        ('நூறு பேர் ஒரே நேரத்தில் book செய்தாலும், இருக்கும் seats-ஐ விட அதிகமாக விற்கப்படாது. Optimistic locking இதை உறுதி செய்கிறது.', 'Even if a hundred people book at the same moment, no extra seats are sold. Optimistic locking guarantees this.'),
    ]),
    ('shot:08-test-payment', [
        ('Development-இல் இது ஒரு test payment page. உண்மையான பணம் இல்லை.', 'In development this is a test payment page. No real money is used.'),
        ('Stripe key கொடுத்தால், Stripe-இன் உண்மையான checkout page வரும்.', "With a Stripe key, Stripe's real checkout page appears instead."),
    ]),
    ('shot:11-qr-ticket', [
        ('பணம் செலுத்திய பிறகு, ரவிக்கு ஒரு QR ticket கிடைக்கிறது. ஒரு email-உம் வருகிறது.', 'After paying, Ravi gets a QR ticket. An email arrives too.'),
        ('QR code-இல் ஒரு random ticket code மட்டுமே உள்ளது. தனிப்பட்ட தகவல் எதுவும் இல்லை.', 'The QR code contains only a random ticket code. No private information.'),
    ]),
    ('shot:15-gate-let-in', [
        ('Event நாளில், volunteer பிரியா gate-இல் அந்த ticket-ஐ scan செய்கிறார்.', 'On the event day, volunteer Priya scans the ticket at the gate.'),
        ('முதல் scan: பச்சை நிறத்தில் LET IN.', 'First scan: a green LET IN.'),
    ]),
    ('shot:16-gate-already-used', [
        ('அதே ticket-ஐ மீண்டும் scan செய்தால், சிவப்பு நிறத்தில் ALREADY USED என்று வரும். எப்போது, யார் scan செய்தார்கள் என்றும் காட்டும்.', 'Scanned again, the same ticket shows a red ALREADY USED, with when and by whom.'),
        ('இது ஒரே ஒரு SQL UPDATE மூலம் நடக்கிறது. இருபது gates ஒரே நேரத்தில் scan செய்தாலும், ஒருவர் மட்டுமே உள்ளே செல்ல முடியும்.', 'This works with a single SQL UPDATE. Even if twenty gates scan at once, only one entry is allowed.'),
    ]),
    ('shot:14-certificate', [
        ('Event முடிந்ததும், உண்மையில் வந்தவர்களுக்கு மட்டுமே PDF certificate கிடைக்கும்.', 'When the event is over, only people who really came get a PDF certificate.'),
    ]),
    ('shot:17-verify-public', [
        ('எந்த company-யும், certificate number-ஐ இந்த page-இல் type செய்து, அது உண்மையானதா என்று சரிபார்க்கலாம்.', 'Any company can type the certificate number on this page and check that it is genuine.'),
    ]),
    ('shot:19-create-event', [
        ('இப்போது organizer மாதவன், Coding Club-க்காக ஒரு புதிய event உருவாக்குகிறார்.', 'Now organizer Madhavan creates a new event for the Coding Club.'),
        ('Browser-உம் server-உம் ஒவ்வொரு field-ஐயும் சரிபார்க்கின்றன.', 'Both the browser and the server check every field.'),
    ]),
    ('shot:24-approval-queue', [
        ('Admin approve செய்த பிறகுதான், students-க்கு அந்த event தெரியும். ஒவ்வொரு மாற்றமும் audit log-இல் பதிவாகிறது.', 'Students see the event only after the admin approves it. Every change is recorded in the audit log.'),
    ]),
    ('shot:21-organizer-analytics', [
        ('Organizer-க்கு ஒரு analytics dashboard உள்ளது: ஒவ்வொரு நாளும் விற்ற tickets, பணம், check-in விகிதம், rating.', 'Organizers have an analytics dashboard: tickets and money per day, check-in rate and rating.'),
        ('எண்ணிக்கையை database கணக்கிடுகிறது. அந்தப் பதில் அறுபது வினாடிகள் cache-இல் வைக்கப்படுகிறது.', 'The database does the counting, and the answer is cached for sixty seconds.'),
    ]),
    ('shot:27-security-blocked', [
        ('வேறு club-இன் organizer கவியா, admin page-ஐத் திறக்க முயன்றால், அனுமதி மறுக்கப்படுகிறது.', 'When Kavya, an organizer of another club, tries to open the admin page, she is refused.'),
        ('Passwords, BCrypt மூலம் பாதுகாக்கப்படுகின்றன. Login token ஒரு httpOnly cookie-இல் வைக்கப்படுகிறது.', 'Passwords are protected with BCrypt, and the login token is kept in an httpOnly cookie.'),
    ]),
    ('slide:s17', [
        ('இந்த project-இல் நூற்று நாற்பத்தாறு automated tests உள்ளன. Service code coverage, தொண்ணூற்று ஒன்று சதவீதம்.', 'The project has 146 automated tests. Service code coverage is 91 percent.'),
        ('ஒவ்வொரு push-இலும், GitHub Actions எல்லா tests-ஐயும் ஓட்டுகிறது.', 'GitHub Actions runs all the tests on every push.'),
    ]),
    ('slide:s21', [
        ('சுருக்கமாக, EventHub ஒரு முழுமையான, பாதுகாப்பான, நன்கு test செய்யப்பட்ட full stack project.', 'In short, EventHub is a complete, secure and well-tested full stack project.'),
        ('அடுத்த கட்டம், இதை internet-இல் deploy செய்வது. நன்றி!', 'The next step is to deploy it on the internet. Thank you!'),
    ]),
]

W, H, PIC_H = 1920, 1080, 880
FONT = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 44)


def scene_image(ref):
    kind, name = ref.split(':')
    path = os.path.join(SLIDES, name + '.png') if kind == 'slide' else os.path.join(SHOTS, name + '.png')
    return Image.open(path).convert('RGB')


def frame(ref, subtitle, out):
    canvas = Image.new('RGB', (W, H), (15, 23, 42))
    pic = scene_image(ref)
    scale = min((W - 80) / pic.width, (PIC_H - 40) / pic.height)
    pic = pic.resize((int(pic.width * scale), int(pic.height * scale)), Image.LANCZOS)
    canvas.paste(pic, ((W - pic.width) // 2, (PIC_H - pic.height) // 2 + 10))
    d = ImageDraw.Draw(canvas)
    d.rectangle([0, PIC_H, W, H], fill=(0, 0, 0))
    lines = textwrap.wrap(subtitle, 70)
    y = PIC_H + (H - PIC_H - len(lines) * 58) // 2
    for line in lines:
        tw = d.textlength(line, font=FONT)
        d.text(((W - tw) / 2, y), line, font=FONT, fill=(255, 255, 255))
        y += 58
    canvas.save(out)


def run(args):
    subprocess.run([FFMPEG, '-y', '-loglevel', 'error', *args], check=True)


async def speak(text, mp3):
    await edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH).save(mp3)


def srt_time(t):
    ms = int(round(t * 1000))
    return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}'


async def main():
    clips, srt, script, t = [], [], [], 0.0
    n = 0
    for s_i, (ref, sentences) in enumerate(SCENES, 1):
        script.append((ref, sentences))
        for ta, en in sentences:
            n += 1
            base = os.path.join(OUT_DIR, f'{n:03d}')
            if not os.path.exists(base + '.mp3'):
                await speak(ta, base + '.mp3')
            run(['-i', base + '.mp3', *(['-af', AFILTER] if AFILTER else []), '-ar', '44100', '-ac', '2', base + '.wav'])
            with wave.open(base + '.wav') as w:
                dur = w.getnframes() / w.getframerate()
            frame(ref, en, base + '.png')
            total = dur + PAUSE
            run(['-loop', '1', '-framerate', '25', '-i', base + '.png', '-i', base + '.wav', '-af', f'apad=pad_dur={PAUSE}',
                 '-t', f'{total:.3f}', '-c:v', 'libx264', '-tune', 'stillimage', '-pix_fmt', 'yuv420p', '-r', '25',
                 '-c:a', 'aac', '-b:a', '160k', base + '.mp4'])
            clips.append(base + '.mp4')
            srt.append(f'{n}\n{srt_time(t)} --> {srt_time(t + dur)}\n{en}\n')
            t += total
            print(f'{n:02d} {dur:5.2f}s  {en[:60]}')
    with open(os.path.join(OUT_DIR, 'list.txt'), 'w', encoding='utf-8') as f:
        f.writelines(f"file '{c.replace(os.sep, '/')}'\n" for c in clips)
    out_mp4 = os.environ['VIDEO_OUT']
    run(['-f', 'concat', '-safe', '0', '-i', os.path.join(OUT_DIR, 'list.txt'), '-c', 'copy', out_mp4])
    with open(out_mp4[:-4] + '_English_subtitles.srt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(srt))
    with open(os.path.join(HERE, 'script.json'), 'w', encoding='utf-8') as f:
        json.dump(script, f, ensure_ascii=False, indent=1)
    print(f'TOTAL {t:.1f}s -> {out_mp4}')

asyncio.run(main())
