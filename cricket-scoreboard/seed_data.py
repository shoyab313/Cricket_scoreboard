import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from scores.models import Team, Player

def seed():
    # Clear existing data
    print("Clearing existing teams and players...")
    Player.objects.all().delete()
    Team.objects.all().delete()

    countries = [
        "India", "Australia", "England", "Pakistan", "South Africa",
        "New Zealand", "Sri Lanka", "West Indies", "Bangladesh",
        "Afghanistan", "Ireland", "Zimbabwe"
    ]

    players_data = {
        "India": ["Virat Kohli", "Rohit Sharma", "Jasprit Bumrah", "Rishabh Pant", "Hardik Pandya", "Ravindra Jadeja", "KL Rahul", "Shubman Gill", "Mohammed Shami", "Kuldeep Yadav", "Suryakumar Yadav"],
        "Australia": ["Pat Cummins", "Steve Smith", "Mitchell Starc", "Glenn Maxwell", "David Warner", "Travis Head", "Josh Hazlewood", "Adam Zampa", "Marnus Labuschagne", "Cameron Green", "Marcus Stoinis"],
        "England": ["Jos Buttler", "Joe Root", "Ben Stokes", "Jofra Archer", "Mark Wood", "Jonny Bairstow", "Harry Brook", "Liam Livingstone", "Adil Rashid", "Sam Curran", "Chris Woakes"],
        "Pakistan": ["Babar Azam", "Shaheen Afridi", "Mohammad Rizwan", "Naseem Shah", "Shadab Khan", "Fakhar Zaman", "Haris Rauf", "Iftikhar Ahmed", "Imam-ul-Haq", "Abrar Ahmed", "Saim Ayub"],
        "South Africa": ["Quinton de Kock", "Kagiso Rabada", "Aiden Markram", "David Miller", "Heinrich Klaasen", "Anrich Nortje", "Keshav Maharaj", "Temba Bavuma", "Marco Jansen", "Lungi Ngidi", "Tabraiz Shamsi"],
        "New Zealand": ["Kane Williamson", "Trent Boult", "Daryl Mitchell", "Rachin Ravindra", "Mitchell Santner", "Tom Latham", "Devon Conway", "Matt Henry", "Tim Southee", "Glenn Phillips", "Lockie Ferguson"],
        "Sri Lanka": ["Wanindu Hasaranga", "Kusal Mendis", "Pathum Nissanka", "Maheesh Theekshana", "Charith Asalanka", "Matheesha Pathirana", "Dilshan Madushanka", "Sadeera Samarawickrama", "Dasun Shanaka", "Angelo Mathews", "Dushmantha Chameera"],
        "West Indies": ["Nicholas Pooran", "Shai Hope", "Andre Russell", "Alzarri Joseph", "Rovman Powell", "Jason Holder", "Brandon King", "Kyle Mayers", "Gudakesh Motie", "Akeal Hosein", "Shimron Hetmyer"],
        "Bangladesh": ["Shakib Al Hasan", "Mushfiqur Rahim", "Mustafizur Rahman", "Litton Das", "Najmul Hossain Shanto", "Taskin Ahmed", "Shoriful Islam", "Mehidy Hasan Miraz", "Towhid Hridoy", "Mahmudullah", "Soumya Sarkar"],
        "Afghanistan": ["Rashid Khan", "Rahmanullah Gurbaz", "Fazalhaq Farooqi", "Mohammad Nabi", "Azmatullah Omarzai", "Mujeeb Ur Rahman", "Naveen-ul-Haq", "Ibrahim Zadran", "Gulbadin Naib", "Noor Ahmad", "Hashmatullah Shahidi"],
        "Ireland": ["Paul Stirling", "Josh Little", "Harry Tector", "Mark Adair", "Andrew Balbirnie", "Curtis Campher", "George Dockrell", "Lorcan Tucker", "Barry McCarthy", "Craig Young", "Gareth Delany"],
        "Zimbabwe": ["Sikandar Raza", "Sean Williams", "Blessing Muzarabani", "Richard Ngarava", "Craig Ervine", "Ryan Burl", "Wellington Masakadza", "Clive Madande", "Luke Jongwe", "Tadiwanashe Marumani", "Innocent Kaia"]
    }

    for country in countries:
        team = Team.objects.create(name=country)
        print(f"Created team: {country}")
        players = players_data.get(country, [])
        for p_name in players:
            Player.objects.create(name=p_name, team=team)
        print(f"Added {len(players)} players for {country}")

    print("Seeding completed successfully!")

if __name__ == "__main__":
    seed()
