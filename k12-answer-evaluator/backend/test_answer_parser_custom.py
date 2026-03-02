from app.services.answer_parser import AnswerParser

text = """2) What is The Solenoid?
1) We shall dicuss a tog long Solenoid. solenoids length is large compared to its radius. It consist of a long wire wound in the form of a helix where the neighbouring twens are closely spaced The net magnetic field is the vedor eum of the fields due to all the turns.
The moving coll Galvarometer.
The Galvanometer consists of a cort, with many turm, Jaee to rats rotate about a fixed aris, in a uniform radial magneti field.
When a current flows through the coil, a torque acts on it. this torque is given by Equation below.
T = NIAB"""

parser = AnswerParser()
parsed = parser.parse_answers(text)

print(parsed)
